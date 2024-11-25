import { ExactOutputResponse, Token } from '../src/types'
import uniswapQuoter from '../src/quoters/DirectUniQuoter'
import { FeeAmount } from '@uniswap/v3-sdk'

const tokenIn: Token = {
  address: '0xaf88d065e77c8cc2239327c5edb3a432268e5831', // USDC address
  decimals: 6,
  symbol: 'USDC',
}

const tokenOut: Token = {
  address: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1', // WETH address
  decimals: 18,
  symbol: 'WETH',
}

function expectValidResult(result: ExactOutputResponse) {
  expect(result.chainId).toBe(42161)
  expect(result.createdAt).toBeInstanceOf(Date)
  expect(result.path.tokens[0]).toEqual(tokenIn)
  expect(result.path.tokens[1]).toEqual(tokenOut)
  expect(result.amountInWei).toMatch(/^\d+$/)
  expect(result.amountOutWei).toMatch(/^\d+$/)
  expect(result.gasEstimate).toBeGreaterThan(0)
  expect(result.provider).toBe('Uniswap')
}

describe('UniswapQuoter', () => {
  it('should return a valid quote batch result', async () => {
    const results: ExactOutputResponse[] = await uniswapQuoter.quoteExactOutputSingleBatch(42161, [
      {
        amount: '1',
        path: { direct: true, tokens: [tokenIn, tokenOut], fees: [FeeAmount.LOW] },
      },
      {
        amount: '0.1',
        path: { direct: true, tokens: [tokenIn, tokenOut], fees: [FeeAmount.MEDIUM] },
      },
      {
        amount: '100',
        path: { direct: true, tokens: [tokenIn, tokenOut], fees: [FeeAmount.MEDIUM] },
      },
    ])

    expect(results.length).toBe(3)

    for (const result of results) {
      expectValidResult(result)
    }
  })

  it('should return a valid multi hop result', async () => {
    const results: ExactOutputResponse[] = await uniswapQuoter.quoteExactOutputMultiHopBatch(
      42161,
      [
        {
          amount: '100',
          path: {
            direct: true,
            tokens: [tokenIn, tokenOut, tokenIn],
            fees: [FeeAmount.LOW, FeeAmount.MEDIUM],
          },
        },
      ],
    )

    expect(results.length).toBe(1)

    for (const result of results) {
      expectValidResult(result)
    }
  })
})
