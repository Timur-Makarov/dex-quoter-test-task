import 'dotenv/config'
import { ethers as ethers5 } from 'ethers'


const arbitrumProviderV5 = new ethers5.providers.JsonRpcProvider(
	process.env.ARBITRUM_MAINNET_RPC || "https://arb1.arbitrum.io/rpc")
const optimismProviderV5 = new ethers5.providers.JsonRpcProvider(
	process.env.OPTIMISM_MAINNET_RPC || "https://mainnet.optimism.io")

const getRpcProviderV5 = (chainId: number) => {
	switch (chainId) {
		case 42161:
			return arbitrumProviderV5
		case 10:
			return optimismProviderV5
		default:
			throw new Error(`Invalid chainId: ${chainId}`)
	}
}

const getRpcUrl = (chainId: number): string => {
	switch (chainId) {
		case 42161:
			return process.env.ARBITRUM_MAINNET_RPC || "https://arb1.arbitrum.io/rpc"
		case 10:
			return process.env.OPTIMISM_MAINNET_RPC || "https://mainnet.optimism.io"
		default:
			throw new Error(`Invalid chainId: ${chainId}`)
	}
}
export { getRpcProviderV5, getRpcUrl }
