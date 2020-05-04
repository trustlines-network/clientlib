import { Observable } from 'rxjs/Observable'
import { fromPromise } from 'rxjs/observable/fromPromise'

import { CurrencyNetwork } from './CurrencyNetwork'
import { Provider } from './providers/Provider'
import { User } from './User'

import utils from './utils'

import {
  DecimalsOptions,
  PaymentMessage,
  PaymentRequestDeclineMessage,
  PaymentRequestMessage,
  ReconnectingWSOptions,
  UsernameMessage
} from './typings'

export class Messaging {
  private user: User
  private currencyNetwork: CurrencyNetwork
  private provider: Provider

  constructor(params: {
    currencyNetwork: CurrencyNetwork
    provider: Provider
    user: User
  }) {
    this.user = params.user
    this.currencyNetwork = params.currencyNetwork
    this.provider = params.provider
  }

  /**
   * Sends a payment request to given `counterParty` and returns created payment request.
   * @param networkAddress Address of currency network.
   * @param counterPartyAddress Address of counter party.
   * @param value Requested payment amount.
   * @param subject Optional subject of payment request.
   */
  public async paymentRequest(
    networkAddress: string,
    counterPartyAddress: string,
    value: number | string,
    subject?: string,
    options: {
      decimalsOptions?: DecimalsOptions
    } = {}
  ): Promise<PaymentRequestMessage> {
    const decimals = await this.currencyNetwork.getDecimals(
      networkAddress,
      options.decimalsOptions || {}
    )
    const type = 'PaymentRequest'
    // TODO: remove nonce from payment request and request decline once it is not used anymore and turn up number of decimals
    // number of decimals had to be turned down to have enough precision for nonce == id
    const randomBigNumber = utils.generateRandomNumber(15)
    const paymentRequest = {
      type,
      networkAddress,
      from: await this.user.getAddress(),
      to: counterPartyAddress,
      amount: utils.formatToAmount(
        utils.calcRaw(value, decimals.networkDecimals),
        decimals.networkDecimals
      ),
      subject,
      nonce: randomBigNumber.toNumber(),
      id: utils.convertToHexString(randomBigNumber)
    }
    const message = {
      ...paymentRequest,
      counterParty: await this.user.getAddress(),
      direction: 'received',
      user: counterPartyAddress
    }
    await this.sendMessage(counterPartyAddress, type, message)

    return {
      ...paymentRequest,
      counterParty: counterPartyAddress,
      direction: 'sent',
      user: await this.user.getAddress()
    }
  }

  /**
   * Sends a payment request decline message to given `counterParty` and returns created message.
   * @param counterPartyAddress Address of counter party.
   * @param id id of the payment request to decline
   * matches either the nonce as a number or id of a payment request as a hex string.
   * @param subject Optional subject of decline message.
   */
  public async paymentRequestDecline(
    counterPartyAddress: string,
    id: number | string,
    subject?: string
  ): Promise<PaymentRequestDeclineMessage> {
    const type = 'PaymentRequestDecline'
    const message = {
      type,
      nonce: typeof id === 'number' ? id : utils.convertHexStringToNumber(id),
      id: typeof id === 'string' ? id : utils.convertToHexString(id),
      subject
    }
    await this.sendMessage(counterPartyAddress, type, message)
    return message
  }

  /**
   * Sends a payment message to given `counterParty` and returns created message.
   * @param counterPartyAddress Address of counter party.
   * @param messageId Message id of the payment
   * @param subject Subject that will be sent to the counterparty
   */
  public async paymentMessage(
    counterPartyAddress: string,
    messageId: string,
    subject: string
  ): Promise<PaymentMessage> {
    const type = 'PaymentMessage'
    const message = {
      type,
      messageId,
      subject
    }
    await this.sendMessage(counterPartyAddress, type, message)
    return message
  }

  /**
   * Returns a websocket observable that can be subscribed to.
   */
  public messageStream(
    reconnectingOptions?: ReconnectingWSOptions
  ): Observable<any> {
    return fromPromise(this.user.getAddress()).flatMap(userAddress =>
      this.provider
        .createWebsocketStream(
          `/streams/messages`,
          'listen',
          {
            type: 'all',
            user: userAddress
          },
          reconnectingOptions
        )
        .mergeMap(data => {
          if (data.type) {
            return [data]
          }
          return Promise.resolve({
            ...JSON.parse(data.message),
            timestamp: data.timestamp
          })
        })
    )
  }

  /**
   * Sends the given username to the specified counter party via messaging.
   * @param username Username to send.
   * @param counterPartyAddress Address of counter party.
   */
  public async sendUsernameToCounterparty(
    username: string,
    counterpartyAddress: string
  ): Promise<UsernameMessage> {
    const type = 'Username'
    const usernameMessage = {
      type,
      from: await this.user.getAddress(),
      to: counterpartyAddress,
      username
    }
    await this.provider.postToEndpoint(`messages/${counterpartyAddress}`, {
      type,
      message: JSON.stringify({
        ...usernameMessage,
        direction: 'received'
      })
    })
    return {
      ...usernameMessage,
      direction: 'sent'
    }
  }

  private async sendMessage(
    counterPartyAddress: string,
    type: string,
    message
  ) {
    await this.provider.postToEndpoint(`messages/${counterPartyAddress}`, {
      type,
      message: JSON.stringify(message)
    })
  }
}
