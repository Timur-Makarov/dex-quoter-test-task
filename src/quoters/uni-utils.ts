import { FeeAmount } from '@uniswap/v3-sdk'

class UniUtils {
  static mapFee = (fee: any) => {
    if (typeof fee === 'number') {
      return fee
    }
    return FeeAmount[fee as keyof typeof FeeAmount]
  }
}

export const ARB_UNI_QUOTER_V2 = '0x61fFE014bA17989E743c5F6cB21bF9697530B21e'
export const UNI_QUOTER_V2_ABI = [
  'function quoteExactOutputSingle(tuple(address tokenIn, address tokenOut, uint256 amount, uint24 fee, uint160 sqrtPriceLimitX96) params) external returns (uint256 amountIn, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)',
  'function quoteExactOutput(bytes path,uint256 amountOut) external returns (uint256 amountIn, uint160[] sqrtPriceX96AfterList, uint32[] initializedTicksCrossedList, uint256 gasEstimate)',
]

export default UniUtils
