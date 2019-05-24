import { ethers } from 'ethers'

import { Contact } from './Contact'
import { CurrencyNetwork } from './CurrencyNetwork'
import { EthWrapper } from './EthWrapper'
import { Event } from './Event'
import { Exchange } from './Exchange'
import { Messaging } from './Messaging'
import { Payment } from './Payment'
import { Transaction } from './Transaction'
import { Trustline } from './Trustline'
import { User } from './User'

import { RelayProvider } from './providers/RelayProvider'
import { TLProvider } from './providers/TLProvider'

import { TLSigner } from './signers/TLSigner'
import { Web3Signer } from './signers/Web3Signer'

import { EthersWallet } from './wallets/EthersWallet'
import {
  TLWallet,
  WALLET_TYPE_ETHERS,
  WALLET_TYPE_IDENTITY
} from './wallets/TLWallet'

import utils from './utils'

import { TLNetworkConfig } from './typings'
import { IdentityWallet } from './wallets/IdentityWallet'

/**
 * The TLNetwork class is the single entry-point into the trustline-network.js library.
 * It contains all of the library's functionality and all calls to the library should be made through a TLNetwork instance.
 */
export class TLNetwork {
  /**
   * User instance containing all user/keystore related methods.
   */
  public user: User
  /**
   * @hidden
   * Transaction instance containing all transaction related methods.
   */
  public transaction: Transaction
  /**
   * Payment instance containing all methods for creating trustline transfers
   * and ETH transfers.
   */
  public payment: Payment
  /**
   * Trustline instance containing all methods for managing trustlines.
   */
  public trustline: Trustline
  /**
   * CurrencyNetwork instance containing all methods for retrieving currency network
   * related information.
   */
  public currencyNetwork: CurrencyNetwork
  /**
   * @hidden
   */
  public contact: Contact
  /**
   * Event instance for retrieving and formatting event logs.
   */
  public event: Event
  /**
   * Exchange instance containing all methods for making and taking orders.
   */
  public exchange: Exchange
  /**
   * @hidden
   */
  public messaging: Messaging
  /**
   * EthWrapper instance for wrapping and unwrapping ETH.
   */
  public ethWrapper: EthWrapper
  /**
   * @hidden
   */
  public web3: any
  /**
   * @hidden
   */
  public signer: TLSigner
  /**
   * @hidden
   */
  public wallet: TLWallet
  /**
   * @hidden
   */
  public provider: TLProvider

  /**
   * Initiates a new TLNetwork instance that provides the public interface to trustlines-network library.
   * @param config Configuration object. See type `tlNetworkConfig` for more information.
   */
  constructor(config: TLNetworkConfig = {}) {
    const {
      protocol = 'http',
      host = 'localhost',
      port = '',
      path = '',
      wsProtocol = 'ws',
      relayApiUrl,
      relayWsApiUrl,
      web3Provider,
      walletType = WALLET_TYPE_ETHERS
    } = config

    this.setProvider(
      new RelayProvider(
        relayApiUrl || utils.buildApiUrl(protocol, host, port, path),
        relayWsApiUrl || utils.buildApiUrl(wsProtocol, host, port, path)
      )
    )

    this.setWallet(walletType, this.provider)
    this.setSigner(web3Provider, this.wallet)

    this.currencyNetwork = new CurrencyNetwork(this.provider)
    this.transaction = new Transaction({
      provider: this.provider,
      signer: this.signer
    })
    this.user = new User({
      provider: this.provider,
      signer: this.signer,
      wallet: this.wallet
    })
    this.contact = new Contact({
      provider: this.provider,
      user: this.user
    })
    this.event = new Event({
      currencyNetwork: this.currencyNetwork,
      provider: this.provider,
      user: this.user
    })
    this.messaging = new Messaging({
      currencyNetwork: this.currencyNetwork,
      provider: this.provider,
      user: this.user
    })
    this.trustline = new Trustline({
      currencyNetwork: this.currencyNetwork,
      event: this.event,
      provider: this.provider,
      transaction: this.transaction,
      user: this.user
    })
    this.payment = new Payment({
      currencyNetwork: this.currencyNetwork,
      event: this.event,
      provider: this.provider,
      transaction: this.transaction,
      user: this.user
    })
    this.exchange = new Exchange({
      currencyNetwork: this.currencyNetwork,
      event: this.event,
      payment: this.payment,
      provider: this.provider,
      transaction: this.transaction,
      user: this.user
    })
    this.ethWrapper = new EthWrapper({
      provider: this.provider,
      transaction: this.transaction,
      user: this.user
    })
  }

  public setProvider(provider: TLProvider): void {
    if (!(provider instanceof RelayProvider)) {
      throw new Error('Provider not supported.')
    }
    this.provider = provider
  }

  public setSigner(web3Provider, wallet: TLWallet): void {
    const signer: TLSigner = web3Provider
      ? new Web3Signer(new ethers.providers.Web3Provider(web3Provider))
      : wallet

    if (
      !(
        signer instanceof Web3Signer ||
        signer instanceof EthersWallet ||
        signer instanceof IdentityWallet
      )
    ) {
      throw new Error('Signer not supported.')
    }
    this.signer = signer
  }

  public setWallet(walletType: string, provider: TLProvider): void {
    let wallet: TLWallet

    if (walletType === WALLET_TYPE_IDENTITY) {
      wallet = new IdentityWallet(provider)
    } else if (walletType === WALLET_TYPE_ETHERS) {
      wallet = new EthersWallet(provider)
    } else {
      throw new Error(`Wallet type given is not handled: ${walletType}`)
    }

    this.wallet = wallet
  }
}
