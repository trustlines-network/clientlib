import { Amount, MetaTransaction, TxInfos } from '../typings'

/**
 * Interface for different provider strategies which extends the given
 * abstract class of `ethers.js`.
 */
export interface TLProvider {
  relayApiUrl: string
  relayWsApiUrl: string
  fetchEndpoint<T>(endpoint: string, options?: object): Promise<T>
  postToEndpoint<T>(endpoint: string, data: any): Promise<T>
  createWebsocketStream(
    endpoint: string,
    functionName: string,
    args: object
  ): any
  getTxInfos(userAddress: string): Promise<TxInfos>
  getMetaTxInfos(userAddress: string): Promise<TxInfos>
  getBalance(userAddress: string): Promise<Amount>
  sendSignedTransaction(signedTransaction: string): Promise<string>
  sendSignedMetaTransaction(
    signedMetaTransaction: MetaTransaction
  ): Promise<string>
}
