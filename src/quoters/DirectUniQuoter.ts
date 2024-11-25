import { BigNumber, ethers } from 'ethers'
import { ExactOutputRequest, ExactOutputResponse, Token } from '../types'
import { IQuoterService } from './IQuoterService'
import { getRpcProviderV5 } from '../config/rpc-providers'
import log from '../config/pino-logger'
import { FeeAmount } from '@uniswap/v3-sdk'
import { UniswapMulticallProvider } from '@uniswap/smart-order-router'
import UniUtils, { ARB_UNI_QUOTER_V2, UNI_QUOTER_V2_ABI } from './uni-utils'

export class DirectUniQuoter implements IQuoterService {
  private static multiCallProviderCache = new Map<number, UniswapMulticallProvider>()
  private readonly name = 'Uniswap'

  async quoteExactOutputSingleBatch(
    chainId: number,
    requests: ExactOutputRequest[],
  ): Promise<ExactOutputResponse[]> {
    const functionParams = requests.map((req) => [
      {
        tokenIn: req.path.tokens[0].address,
        tokenOut: req.path.tokens[1].address,
        amount: ethers.utils.parseUnits(req.amount, req.path.tokens[1].decimals),
        fee: UniUtils.mapFee(req.path.fees[0]),
        sqrtPriceLimitX96: 0,
      },
    ])

    const results = await this.executeMultiCall(chainId, 'quoteExactOutputSingle', functionParams)
    return results
      .map((result, index) => this.formatQuoteResponse(result, requests[index], chainId))
      .filter(Boolean) as ExactOutputResponse[]
  }

  async quoteExactOutputMultiHopBatch(
    chainId: number,
    requests: ExactOutputRequest[],
  ): Promise<ExactOutputResponse[]> {
    const functionParams = requests.map((req) => [
      this.encodePathForExactOutput(req.path.tokens, req.path.fees),
      ethers.utils.parseUnits(req.amount, req.path.tokens[req.path.tokens.length - 1].decimals),
    ])

    const results = await this.executeMultiCall(chainId, 'quoteExactOutput', functionParams)
    return results
      .map((result, index) => this.formatQuoteResponse(result, requests[index], chainId))
      .filter(Boolean) as ExactOutputResponse[]
  }

  async quoteExactOutputSingle(
    chainId: number,
    request: ExactOutputRequest,
  ): Promise<ExactOutputResponse | null> {
    const quotes = await this.quoteExactOutputSingleBatch(chainId, [request])
    return quotes[0] || null
  }

  // async quoteExactOutputMultiHop(
  // 	chainId: number,
  // 	request: ExactOutputRequest
  // ): Promise<ExactOutputResponse | null> {
  // 	const quotes = await this.quoteExactOutputMultiHopBatch(chainId, [request])
  // 	return quotes[0] || null
  // }

  private getMultiCallProvider(chainId: number) {
    let provider = DirectUniQuoter.multiCallProviderCache.get(chainId)
    if (!provider) {
      provider = new UniswapMulticallProvider(chainId, getRpcProviderV5(chainId))
      DirectUniQuoter.multiCallProviderCache.set(chainId, provider)
    }
    return provider
  }

  private encodePathForExactOutput(tokens: Token[], fees: FeeAmount[]): string {
    if (tokens.length !== fees.length + 1) {
      throw new Error('Tokens length must be one more than fees length')
    }

    let path = tokens[tokens.length - 1].address.toLowerCase()
    for (let i = fees.length - 1; i >= 0; i--) {
      const feeHex = ethers.utils
        .hexZeroPad(ethers.utils.hexlify(UniUtils.mapFee(fees[i])), 3)
        .slice(2)
      path += feeHex + tokens[i].address.toLowerCase().slice(2)
    }
    return path
  }

  private async executeMultiCall(chainId: number, functionName: string, functionParams: any[]) {
    const contractInterface = new ethers.utils.Interface(UNI_QUOTER_V2_ABI)
    try {
      const { results } = await this.getMultiCallProvider(
        chainId,
      ).callSameFunctionOnContractWithMultipleParams({
        address: ARB_UNI_QUOTER_V2,
        contractInterface,
        functionName,
        functionParams,
      })
      return results
    } catch (error: any) {
      log.error(error, `Error executing ${functionName}: ${error.message}`)
      return []
    }
  }

  private formatQuoteResponse(
    result: any,
    request: ExactOutputRequest,
    chainId: number,
  ): ExactOutputResponse | null {
    if (!result.success) {
      const tokens = request.path.tokens.map((t) => t.symbol).join('/')
      log.warn(`Quote not found - ${tokens} result: ${JSON.stringify(result)}`)
      return null
    }

    const [amountInWei, , , gasEstimate] = result.result as [BigNumber, any, any, BigNumber]
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

export default new DirectUniQuoter()
