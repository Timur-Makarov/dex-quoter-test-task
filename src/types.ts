import { FeeAmount } from "@uniswap/v3-sdk"


export interface Token {
	address: string;
	decimals: number;
	symbol: string;
}

export interface UniPath {
	direct: boolean;
	tokens: Token[];
	fees: FeeAmount[];
}

export interface ExactOutputRequest {
	path: UniPath;
	amount: string;
}

export interface ExactOutputResponse {
	createdAt: Date;
	chainId: number;
	path: UniPath;
	amountIn: string;
	amountOut: string;
	amountInWei: string;
	amountOutWei: string;
	gasEstimate?: number;
	provider: string;   // source of the quote (e.g., "Uniswap", "Sushiswap", etc.)
}
