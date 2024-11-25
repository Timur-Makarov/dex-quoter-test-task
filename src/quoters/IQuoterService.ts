import { ExactOutputRequest, ExactOutputResponse } from '../types'

export interface IQuoterService {
  quoteExactOutputSingle(
    chainId: number,
    request: ExactOutputRequest,
  ): Promise<ExactOutputResponse | null>

  quoteExactOutputSingleBatch(
    chainId: number,
    requests: ExactOutputRequest[],
  ): Promise<ExactOutputResponse[]>

  quoteExactOutputMultiHopBatch(
    chainId: number,
    requests: ExactOutputRequest[],
  ): Promise<ExactOutputResponse[]>
}
