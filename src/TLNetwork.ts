import { Configuration } from './Configuration'
import { User } from './User'
import { Transaction } from './Transaction'
import { Payment } from './Payment'
import { Trustline } from './Trustline'
import { CurrencyNetwork } from './CurrencyNetwork'
import { Contact } from './Contact'
import { Utils } from './Utils'
import { Event } from './Event'
import { Exchange } from './Exchange'
import { Messaging } from './Messaging'
import { EthWrapper } from './EthWrapper'

import { TLNetworkConfig } from './typings'

/**
 * The TLNetwork class is the single entry-point into the trustline-network.js library.
 * It contains all of the library's functionality and all calls to the library should be made through a TLNetwork instance.
 */
export class TLNetwork {
  /**
   * @hidden
   * Configuration instance containing all configurable parameters.
   */
  public configuration: Configuration
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
   * @hidden
   */
  public utils: Utils
  /**
   * Event instance for retrieving event logs.
   */
  public event: Event
  /**
   * @hidden
   */
  public exchange: Exchange
  /**
   * @hidden
   */
  public messaging: Messaging
  public ethWrapper: EthWrapper

  /**
   * Initiates a new TLNetwork instance that provides the public interface to trustlines-network library.
   * @param config Configuration object. See type `TLNetworkConfig` for more information.
   */
  constructor (config: TLNetworkConfig = {}) {
    this.configuration = new Configuration(config)
    this.utils = new Utils(this.configuration)
    this.transaction = new Transaction(this.utils)
    this.currencyNetwork = new CurrencyNetwork(this.utils)
    this.user = new User(this.transaction, this.utils)
    this.contact = new Contact(this.user, this.utils)
    this.event = new Event(this.user, this.utils, this.currencyNetwork)
    this.trustline = new Trustline(this.event, this.user, this.utils, this.transaction, this.currencyNetwork)
    this.payment = new Payment(this.event, this.user, this.utils, this.transaction, this.currencyNetwork)
    this.exchange = new Exchange(this.event, this.user, this.utils, this.transaction, this.currencyNetwork, this.payment)
    this.messaging = new Messaging(this.user, this.utils, this.currencyNetwork)
    this.ethWrapper = new EthWrapper(this.user, this.utils, this.transaction)
  }

}
