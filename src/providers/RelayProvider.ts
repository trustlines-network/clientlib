import { BigNumber } from 'bignumber.js'
import { ethers } from 'ethers'

import utils from '../utils'

import { TLProvider } from './TLProvider'

import {
  Amount,
  MetaTransaction,
  MetaTransactionFees,
  MetaTransactionStatus,
  TxInfos,
  TxInfosRaw
} from '../typings'

import { Provider } from './Provider'

export class RelayProvider extends Provider implements TLProvider {
  constructor(relayApiUrl: string, relayWsApiUrl: string) {
    super(relayApiUrl, relayWsApiUrl)
  }

  /**
   * Returns needed information for creating an ethereum transaction.
   * @param address Address of user creating the transaction
   * @returns Information for creating an ethereum transaction for the given user address.
   *          See type `TxInfos` for more details.
   */
  public async getTxInfos(address: string): Promise<TxInfos> {
    const { nonce, gasPrice, balance } = await this.fetchEndpoint<TxInfosRaw>(
      `users/${address}/txinfos`
    )
    return {
      balance: new BigNumber(balance),
      gasPrice: new BigNumber(gasPrice),
      nonce
    }
  }

  /**
   * Returns needed information for creating a meta transaction.
   * @param address Address of user creating the transaction
   * @returns Information for creating an ethereum transaction for the given identity address.
   *          See type `TxInfos` for more details.
   */
  public async getMetaTxInfos(address: string): Promise<TxInfos> {
    const { identity, nextNonce, balance } = await this.fetchEndpoint<any>(
      `/identities/${address}`
    )
    return {
      balance: new BigNumber(balance),
      gasPrice: new BigNumber(0),
      nonce: nextNonce
    }
  }

  /**
   * Returns the fees the provider would be willing to pay for the transaction
   * @param metaTransaction Meta transaction to be relayed
   * @returns The fees value and currency network of fees for given meta transaction
   */
  public async getMetaTxFees(
    metaTransaction: MetaTransaction
  ): Promise<MetaTransactionFees> {
    const potentialDelegationFees = await this.postToEndpoint<any>(
      `/meta-transaction-fees`,
      {
        metaTransaction
      }
    )
    let baseFee = '0'
    let gasPrice = '0'
    let currencyNetworkOfFees = '0x' + '0'.repeat(40)
    if (potentialDelegationFees.length) {
      // For now just get the first possible fee given by the relay server
      // Could be changed later to show the possible fees to the user and let it decide
      baseFee = potentialDelegationFees[0].baseFee
      gasPrice = potentialDelegationFees[0].gasPrice
      currencyNetworkOfFees = potentialDelegationFees[0].currencyNetworkOfFees
    }
    return {
      baseFee,
      gasPrice,
      currencyNetworkOfFees
    }
  }

  public async getMetaTxStatus(
    identityAddress: string,
    metaTransactionHash: string
  ): Promise<MetaTransactionStatus> {
    return this.fetchEndpoint<any>(
      `/identities/${identityAddress}/meta-transactions/${metaTransactionHash}/status`
    )
  }

  /**
   * Returns balance of given address.
   * @param address Address to determine balance for.
   */
  public async getBalance(address: string): Promise<Amount> {
    const balance = await this.fetchEndpoint<string>(`users/${address}/balance`)
    return utils.formatToAmount(balance, 18)
  }

  /**
   * Send the given _signedTransaction_ to a relay server to execute it on the
   * blockchain and returns a `Promise` with the transaction hash.
   * @param signedTransaction
   */
  public async sendSignedTransaction(
    signedTransaction: string
  ): Promise<string> {
    const headers = new Headers({ 'Content-Type': 'application/json' })
    const options = {
      body: JSON.stringify({
        rawTransaction: ethers.utils.hexlify(signedTransaction)
      }),
      headers,
      method: 'POST'
    }
    return this.fetchEndpoint<string>(`relay`, options)
  }

  /**
   * Send the given signed meta-transaction to a relay server to execute it on the
   * blockchain and returns a `Promise` with the transaction hash.
   * @param signedMetaTransaction Signed meta-transaction to be sent to the relay server
   * @returns The hash of the transaction sent by the relay server, not to be confused with the hash of the meta-transaction
   */
  public async sendSignedMetaTransaction(
    signedMetaTransaction: MetaTransaction
  ): Promise<string> {
    return this.postToEndpoint<string>('relay-meta-transaction', {
      metaTransaction: signedMetaTransaction
    })
  }
}
