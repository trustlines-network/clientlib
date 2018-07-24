import { Observable } from 'rxjs/Observable'

import { Utils } from './Utils'
import { User } from './User'
import { CurrencyNetwork } from './CurrencyNetwork'

import {
  EventFilterOptions,
  AnyNetworkEventRaw,
  AnyEvent,
  AnyEventRaw,
  AnyTokenEventRaw,
  AnyExchangeEventRaw
} from './typings'

const CURRENCY_NETWORK = 'CurrencyNetwork'
const TOKEN = 'Token'

/**
 * The Event class contains all methods related to retrieving event logs.
 */
export class Event {
  private _currencyNetwork: CurrencyNetwork
  private _user: User
  private _utils: Utils

  constructor (
    user: User,
    utils: Utils,
    currencyNetwork: CurrencyNetwork
  ) {
    this._currencyNetwork = currencyNetwork
    this._user = user
    this._utils = utils
  }

  /**
   * Returns event logs of loaded user in a specified currency network.
   * @param networkAddress Address of a currency network.
   * @param type Type of event `TrustlineUpdateRequest`, `TrustlineUpdate` or `Transfer`.
   * @param filter Event filter object. See `EventFilterOptions` for more information.
   */
  public async get<T> (
    networkAddress: string,
    filter: EventFilterOptions = {}
  ): Promise<T[]> {
    const { _currencyNetwork, _user, _utils } = this
    const baseUrl = `networks/${networkAddress}/users/${_user.address}/events`
    const parameterUrl = _utils.buildUrl(baseUrl, filter)
    const [ events, decimals ] = await Promise.all([
      _utils.fetchUrl<AnyNetworkEventRaw[]>(parameterUrl),
      _currencyNetwork.getDecimals(networkAddress)
    ])
    return events.map(event => _utils.formatEvent<T>(event, decimals))
  }

  /**
   * Returns event logs of loaded user in all currency networks.
   * @param filter Event filter object. See `EventFilterOptions` for more information.
   */
  public async getAll (filter: EventFilterOptions = {}): Promise<AnyEvent[]> {
    const { _user, _utils } = this
    const baseUrl = `users/${_user.address}/events`
    const parameterUrl = _utils.buildUrl(baseUrl, filter)
    const events = await _utils.fetchUrl<AnyEventRaw[]>(parameterUrl)
    return this.setDecimalsAndFormat(events)
  }

  /**
   * @hidden
   */
  public updateStream (): Observable<any> {
    return this._utils.websocketStream(
      'streams/events',
      'subscribe',
      {
        'event': 'all',
        'user': this._user.address
      }
    ).mergeMap(event => {
      if (event.hasOwnProperty('networkAddress')) {
        return this._currencyNetwork.getDecimals(event.networkAddress)
          .then(decimals => this._utils.formatEvent(event, decimals))
      } else {
        return Promise.resolve(event)
      }
    })
  }

  /**
   * Fetches decimals for given event logs and formats them so that all numerical
   * values are `Amount` objects.
   * @param rawEvents trustlines network events
   */
  public async setDecimalsAndFormat (rawEvents: AnyEventRaw[]): Promise<any[]> {
    const addressesMap = this._getUniqueAddressesMap(rawEvents)
    const decimalsMap = await this._getDecimalsMap(addressesMap)
    return rawEvents.map(event => {
      if ((event as AnyNetworkEventRaw).networkAddress) {
        return this._utils.formatEvent<AnyNetworkEventRaw>(
          event,
          decimalsMap[(event as AnyNetworkEventRaw).networkAddress]
        )
      }
      if ((event as AnyTokenEventRaw).tokenAddress) {
        return this._utils.formatEvent<AnyTokenEventRaw>(
          event,
          decimalsMap[(event as AnyTokenEventRaw).tokenAddress]
        )
      }
      if ((event as AnyExchangeEventRaw).exchangeAddress) {
        const {
          makerTokenAddress,
          takerTokenAddress
        } = event as AnyExchangeEventRaw
        return this._utils.formatExchangeEvent(
          event as AnyExchangeEventRaw,
          decimalsMap[makerTokenAddress],
          decimalsMap[takerTokenAddress]
        )
      }
      return event
    })
  }

  /**
   * Returns unique addresses from a list of event logs and maps to whether the address
   * is a CurrencyNetwork or Token contract.
   * @param events trustlines network events
   */
  private _getUniqueAddressesMap (events: AnyEventRaw[]): object {
    return events.reduce((result, e) => {
      if ((e as AnyNetworkEventRaw).networkAddress) {
        result[(e as AnyNetworkEventRaw).networkAddress] = CURRENCY_NETWORK
      } else if ((e as AnyTokenEventRaw).tokenAddress) {
        result[(e as AnyTokenEventRaw).tokenAddress] = TOKEN
      } else if ((e as AnyExchangeEventRaw).exchangeAddress) {
        const { makerTokenAddress, takerTokenAddress } = (e as AnyExchangeEventRaw)
        if (!result[makerTokenAddress]) {
          result[makerTokenAddress] = this._currencyNetwork.isNetwork(makerTokenAddress)
            ? CURRENCY_NETWORK
            : TOKEN
        }
        if (!result[takerTokenAddress]) {
          result[takerTokenAddress] = this._currencyNetwork.isNetwork(takerTokenAddress)
            ? CURRENCY_NETWORK
            : TOKEN
        }
      }
      return result
    }, {})
  }

  /**
   * Returns a mapping from address to decimals
   * @param addressesMap mapping from address to event type
   */
  private async _getDecimalsMap (addressesMap: object): Promise<object> {
    const addresses = Object.keys(addressesMap)
    const decimalsList = await Promise.all(
      addresses.map(address => {
        if (addressesMap[address] === CURRENCY_NETWORK) {
          return this._currencyNetwork.getDecimals(address)
        }
        if (addressesMap[address] === TOKEN) {
          // TODO: find different way to get decimals of token
          // NOTE: only expecting WrappedEthEvents for now
          return this._currencyNetwork.getDecimals(address, 18)
        }
      })
    )
    return addresses.reduce((decimalsMap, network, i) => {
      decimalsMap[network] = decimalsList[i]
      return decimalsMap
    }, {})
  }
}
