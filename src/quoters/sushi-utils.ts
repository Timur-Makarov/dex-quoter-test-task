export const ARB_SUSHI_ROUTER_V2 = '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
export const ARB_SUSHI_FACTORY_V2 = '0xc35DADB65012eC5796536bD9864eD8773aBc74C4'

export const SUSHI_ROUTER_V2_ABI = [
  'function getAmountsIn(uint amountOut, address[] memory path) public view returns (uint[] memory amounts)',
  'function getAmountIn(uint amountOut, uint reserveIn, uint reserveOut) public pure returns (uint amountIn)',
]

export const SUSHI_FACTORY_V2_ABI = [
  'function getPair(address tokenA, address tokenB) external view returns (address pair)',
]
export const SUSHI_PAIR_V2_ABI = [
  'function getReserves() public view returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast)',
]
