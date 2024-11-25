import { ExactOutputResponse, Token } from '../src/types'
import sushiSwapQuoter from '../src/quoters/DirectSushiQuoter'

// Swapped because, apparently, there is no USDC/WETH pair on the v2.

const tokenIn: Token = {
  address: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1', // WETH address
  decimals: 18,
  symbol: 'WETH',
}

const tokenOut: Token = {
  address: '0xaf88d065e77c8cc2239327c5edb3a432268e5831', // USDC address
  decimals: 6,
  symbol: 'USDC',
}

function expectValidResult(result: ExactOutputResponse) {
  expect(result.chainId).toBe(42161)
  expect(result.createdAt).toBeInstanceOf(Date)
  expect(result.path.tokens[0]).toEqual(tokenIn)
  expect(result.path.tokens[1]).toEqual(tokenOut)
  expect(result.amountInWei).toMatch(/^\d+$/)
  expect(result.amountOutWei).toMatch(/^\d+$/)
  expect(result.gasEstimate).toBeGreaterThan(0)
  expect(result.provider).toBe('SushiSwap')
}

describe('SushiSwapQuoter', () => {
  it('should return a valid quote batch result', async () => {
    const results: ExactOutputResponse[] = await sushiSwapQuoter.quoteExactOutputSingleBatch(
      42161,
      [
        {
          amount: '100',
          path: { direct: true, tokens: [tokenIn, tokenOut], fees: [] },
        },
        {
          amount: '1',
          path: { direct: true, tokens: [tokenOut, tokenIn], fees: [] },
        },
        {
          amount: '100',
          path: { direct: true, tokens: [tokenIn, tokenOut], fees: [] },
        },
      ],
    )

    // 2 good ones and one "Quote not found".
    expect(results.length).toBe(2)

    for (const result of results) {
      expectValidResult(result)
    }
  })

  it('should return a valid multi hop result', async () => {
    const results: ExactOutputResponse[] = await sushiSwapQuoter.quoteExactOutputMultiHopBatch(
      42161,
      [
        {
          amount: '100',
          path: { direct: true, tokens: [tokenIn, tokenOut], fees: [] },
        },
        {
          amount: '200',
          path: { direct: true, tokens: [tokenIn, tokenOut], fees: [] },
        },
      ],
    )

    expect(results.length).toBe(2)

    for (const result of results) {
      expectValidResult(result)
    }
  })
})
