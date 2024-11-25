import { ExactOutputRequest, ExactOutputResponse } from '../types'
import { IQuoterService } from './IQuoterService'
import { Result, UniswapMulticallProvider } from '@uniswap/smart-order-router'
import { getRpcProviderV5 } from '../config/rpc-providers'
import { BigNumber, ethers } from 'ethers'
import {
  ARB_SUSHI_FACTORY_V2,
  ARB_SUSHI_ROUTER_V2,
  SUSHI_FACTORY_V2_ABI,
  SUSHI_PAIR_V2_ABI,
  SUSHI_ROUTER_V2_ABI,
} from './sushi-utils'
import log from '../config/pino-logger'

export class DirectSushiQuoter implements IQuoterService {
  private static multiCallProviderCache = new Map<number, UniswapMulticallProvider>()
  private readonly name = 'SushiSwap'

  async quoteExactOutputSingle(
    chainId: number,
    request: ExactOutputRequest,
  ): Promise<ExactOutputResponse | null> {
    const quotes = await this.quoteExactOutputSingleBatch(chainId, [request])
    return quotes[0] || null
  }

  // There is no need for this function, as it's the same steps taken by `getAmountsIn`
  // on a router contacts, but in more declarative way.
  // https://docs.sushi.com/docs/Products/Classic%20AMM/Contracts/V2Library#getamountsin
  async quoteExactOutputSingleBatch(
    chainId: number,
    requests: ExactOutputRequest[],
  ): Promise<ExactOutputResponse[]> {
    const getPairParams = requests.map((req) => {
      if (req.path.tokens.length !== 2) {
        throw new Error('2 tokens must be provided in path.tokens')
      }
      return [req.path.tokens[0].address, req.path.tokens[1].address]
    })

    const getPairResults = await this.executeMultiCall<string[]>(
      ARB_SUSHI_FACTORY_V2,
      SUSHI_FACTORY_V2_ABI,
      chainId,
      'getPair',
      getPairParams,
    )

    const pairs = getPairResults.map((r) => (r.success ? r.result[0] : ''))

    const reservesResults = await this.executeMultiCallSameFunction<[BigNumber, BigNumber, Number]>(
      pairs,
      SUSHI_PAIR_V2_ABI,
      chainId,
      'getReserves',
      [],
    )

    const functionParams = requests.map((req, i) => {
      const reserve = reservesResults[i]

      if (reserve.success) {
        return [
          ethers.utils.parseUnits(req.amount, req.path.tokens.at(-1)!.decimals),
          reserve.result[0].toString(),
          reserve.result[1].toString(),
        ]
      } else {
        return []
      }
    })

    const results = await this.executeMultiCall<BigNumber[]>(
      ARB_SUSHI_ROUTER_V2,
      SUSHI_ROUTER_V2_ABI,
      chainId,
      'getAmountIn',
      functionParams,
    )

    return results
      .map((result, index) => this.formatQuoteResponse(result, requests[index], chainId))
      .filter(Boolean) as ExactOutputResponse[]
  }

  async quoteExactOutputMultiHopBatch(
    chainId: number,
    requests: ExactOutputRequest[],
  ): Promise<ExactOutputResponse[]> {
    const functionParams = requests.map((req) => {
      if (req.path.tokens.length < 2) {
        throw new Error('Must be 2 or more tokens provided in path.tokens')
      }

      return [
        ethers.utils.parseUnits(req.amount, req.path.tokens.at(-1)!.decimals),
        req.path.tokens.map((token) => token.address.toLowerCase()),
      ]
    })

    const results = await this.executeMultiCall<BigNumber[][]>(
      ARB_SUSHI_ROUTER_V2,
      SUSHI_ROUTER_V2_ABI,
      chainId,
      'getAmountsIn',
      functionParams,
    )

    return results
      .map((result, index) => this.formatQuoteResponse(result, requests[index], chainId))
      .filter(Boolean) as ExactOutputResponse[]
  }

  private getMultiCallProvider(chainId: number) {
    let provider = DirectSushiQuoter.multiCallProviderCache.get(chainId)

    if (!provider) {
      provider = new UniswapMulticallProvider(chainId, getRpcProviderV5(chainId))
      DirectSushiQuoter.multiCallProviderCache.set(chainId, provider)
    }

    return provider
  }

  private async executeMultiCall<TResult = any>(
    contactAddress: string,
    contactABI: string[],
    chainId: number,
    functionName: string,
    functionParams: any[],
  ) {
    const contractInterface = new ethers.utils.Interface(contactABI)

    try {
      const { results } = await this.getMultiCallProvider(
        chainId,
      ).callSameFunctionOnContractWithMultipleParams<any, TResult>({
        address: contactAddress,
        contractInterface,
        functionName,
        functionParams,
      })

      return results
    } catch (error: any) {
      log.error(error, `Error executing ${functionName}: ${error.message}`)
      throw error
    }
  }

  private async executeMultiCallSameFunction<TResult = any>(
    contactAddresses: string[],
    contactABI: string[],
    chainId: number,
    functionName: string,
    functionParams: any[],
  ) {
    const contractInterface = new ethers.utils.Interface(contactABI)

    try {
      const { results } = await this.getMultiCallProvider(
        chainId,
      ).callSameFunctionOnMultipleContracts<any, TResult>({
        addresses: contactAddresses,
        contractInterface,
        functionName,
        functionParams,
      })

      return results
    } catch (error: any) {
      log.error(error, `Error executing ${functionName}: ${error.message}`)
      throw error
    }
  }

  private formatQuoteResponse(
    result: Result<any>,
    request: ExactOutputRequest,
    chainId: number,
  ): ExactOutputResponse | null {
    if (!result.success) {
      const tokens = request.path.tokens.map((t) => t.symbol).join('/')
      log.warn(`Quote not found - ${tokens} result: ${JSON.stringify(result)}`)
      return null
    }

    let amountInWei: BigNumber
    let gasEstimate: BigNumber

    // This covers only the two response formats from above (multiCall and batch).
    // There is no need for this ugliness, of course. And wouldn't be used on a prod.
    if (Array.isArray(result.result[0])) {
      amountInWei = result.result[0]!.at(-2)!
      gasEstimate = result.result[0]!.at(-1)!
    } else {
      amountInWei = result.result[0]!
      gasEstimate = BigNumber.from(1)
    }

    const { path, amount } = request
    const tokenIn = path.tokens[0]
    const tokenOut = path.tokens[path.tokens.length - 1]

    return {
      createdAt: new Date(),
      chainId,
      path,
      amountIn: ethers.utils.formatUnits(amountInWei, tokenIn.decimals),
      amountOut: amount,
      amountInWei: amountInWei.toString(),
      amountOutWei: ethers.utils.parseUnits(amount, tokenOut.decimals).toString(),
      gasEstimate: gasEstimate.toNumber(),
      provider: this.name,
    }
  }
}

export default new DirectSushiQuoter()
