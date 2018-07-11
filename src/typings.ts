import { BigNumber } from 'bignumber.js'

/**
 * Configuration object for a TLNetwork instance
 */
export interface TLNetworkConfig {
  /**
   * Protocol for communicating with a relay server
   */
  protocol?: string,
  /**
   * Host of a relay server
   */
  host?: string,
  /**
   * Port for communcation
   */
  port?: number,
  /**
   * Base path for the relay api
   */
  path?: string,
  /**
   * Protocol for websockets
   */
  wsProtocol?: string
}

/**
 * For internal use of `prepFuncTx` and `prepValueTx`.
 */
export interface TxOptionsInternal {
  value?: BigNumber,
  gasPrice?: BigNumber,
  gasLimit?: BigNumber
}

export interface TxOptions {
  value?: string,
  gasPrice?: string,
  gasLimit?: string
}

export interface TLOptions extends TxOptions {
  decimals?: number
}

export interface PaymentOptions extends TLOptions {
  maximumHops?: number,
  maximumFees?: number
}

export interface AmountInternal {
  raw: BigNumber,
  value: BigNumber,
  decimals: number
}

export interface Amount {
  raw: string,
  value: string,
  decimals: number
}

// EVENTS
export interface EventFilterOptions {
  type?: string,
  fromBlock?: number
}

export interface BlockchainEvent {
  type: string,
  timestamp: number,
  blockNumber: number,
  status: string,
  transactionId: string,
}

export interface TLEvent extends BlockchainEvent {
  from: string,
  to: string,
  direction: string,
  address: string
}

export interface NetworkEvent extends TLEvent {
  networkAddress: string
}

export interface NetworkTransferEventRaw extends NetworkEvent {
  amount: string
}

export interface NetworkTransferEvent extends NetworkEvent {
  amount: Amount
}

export interface NetworkTrustlineEventRaw extends NetworkEvent {
  given: string,
  received: string
}

export interface NetworkTrustlineEvent extends NetworkEvent {
  given: Amount,
  received: Amount
}

export type AnyNetworkEvent = NetworkTransferEvent | NetworkTrustlineEvent
export type AnyNetworkEventRaw = NetworkTransferEventRaw | NetworkTrustlineEventRaw

export interface TokenEvent extends TLEvent {
  tokenAddress: string,
}

export interface TokenAmountEventRaw extends TokenEvent {
  amount: string
}

export interface TokenAmountEvent extends TLEvent {
  amount: Amount
}

export type AnyTokenEvent = TokenAmountEvent
export type AnyTokenEventRaw = TokenAmountEventRaw

export type AnyEvent = AnyNetworkEvent | AnyTokenEvent
export type AnyEventRaw = AnyNetworkEventRaw | AnyTokenEventRaw

// TRANSACTION
export interface TxObject {
  rawTx: string,
  ethFees: Amount
}

export interface TxObjectInternal {
  rawTx: string,
  ethFees: AmountInternal
}

export type AmountEventRaw = NetworkTransferEventRaw | TokenAmountEventRaw

/**
 * Information for creating an ethereum transaction of a given user address
 * as returned by the relay server.
 */
export interface TxInfosRaw {
  /**
   * Amount of ETH in gwei for every unit of gas user is willing to pay
   */
  gasPrice: string,
  /**
   * Balance of given user address in ETH
   */
  balance: string,
  /**
   * Transaction count of given user address
   */
  nonce: number
}

export interface TxInfos {
  /**
   * Amount of ETH in gwei for every unit of gas user is willing to pay
   */
  gasPrice: BigNumber,
  /**
   * Balance of given user address in ETH
   */
  balance: BigNumber,
  /**
   * Transaction count of given user address
   */
  nonce: number
}

// PAYMENT
export interface TLTxObject extends TxObject {
  path: string[],
  maxFees: Amount
}

export interface PathObject {
  path: string[],
  maxFees: Amount,
  estimatedGas: BigNumber,
  isNetwork?: boolean
}

export interface PathRaw {
  path: string[],
  fees: string,
  estimatedGas: number
}

// CURRENCY NETWORK
export interface Network {
  name: string,
  abbreviation: string,
  address: string
}

export interface NetworkDetails extends Network {
  decimals: number,
  numUsers: number
}

export interface UserOverview {
  leftReceived: Amount,
  balance: Amount,
  given: Amount,
  received: Amount,
  leftGiven: Amount
}

export interface UserOverviewRaw {
  leftReceived: string,
  balance: string,
  given: string,
  received: string,
  leftGiven: string
}

// USER
export interface UserObject {
  address: string,
  pubKey: string,
  keystore: string
}

export interface Signature {
  ecSignature: ECSignature,
  concatSig: string
}

// TRUSTLINE
export interface TrustlineObject {
  id: string,
  address: string,
  balance: Amount,
  given: Amount,
  received: Amount,
  leftGiven: Amount,
  leftReceived: Amount
}

export interface TrustlineRaw {
  id: string,
  address: string,
  balance: string,
  given: string,
  received: string,
  leftGiven: string,
  leftReceived: string
}

// EXCHANGE
export interface Order {
  maker: string // this.user.address
  taker: string // optional
  makerFee: Amount
  takerFee: Amount
  makerTokenAmount: Amount // required
  takerTokenAmount: Amount // required
  makerTokenAddress: string // required
  takerTokenAddress: string // required
  salt: string
  exchangeContractAddress: string
  feeRecipient: string
  expirationUnixTimestampSec: string
  hash?: string,
  filledMakerTokenAmount?: Amount,
  filledTakerTokenAmount?: Amount,
  cancelledMakerTokenAmount?: Amount,
  cancelledTakerTokenAmount?: Amount,
  availableMakerTokenAmount?: Amount,
  availableTakerTokenAmount?: Amount
}

/**
 * Order object as returned by relay
 */
export interface OrderRaw {
  maker: string // this.user.address
  taker: string // optional
  makerFee: string
  takerFee: string
  makerTokenAmount: string // required
  takerTokenAmount: string // required
  makerTokenAddress: string // required
  takerTokenAddress: string // required
  salt: string
  exchangeContractAddress: string
  feeRecipient: string
  expirationUnixTimestampSec: string,
  filledMakerTokenAmount: string,
  filledTakerTokenAmount: string,
  cancelledMakerTokenAmount: string,
  cancelledTakerTokenAmount: string,
  availableMakerTokenAmount: string,
  availableTakerTokenAmount: string
}

export interface Orderbook {
  asks: Order[],
  bids: Order[]
}

export interface OrderbookRaw {
  asks: OrderRaw[],
  bids: OrderRaw[]
}

export interface SignedOrder extends Order {
  ecSignature: ECSignature
}

export interface ECSignature {
  v: number
  r: string
  s: string
}

export interface FeesRequest {
  exchangeContractAddress: string,
  expirationUnixTimestampSec: BigNumber,
  maker: string,
  makerTokenAddress: string,
  makerTokenAmount: BigNumber,
  salt: BigNumber,
  taker: string,
  takerTokenAddress: string,
  takerTokenAmount: BigNumber
}

export interface FeesResponse {
  feeRecipient: string,
  makerFee: BigNumber,
  takerFee: BigNumber
}

export interface ExchangeOptions extends TxOptions {
  makerTokenDecimals?: number,
  takerTokenDecimals?: number,
  expirationUnixTimestampSec?: number
}

export interface OrderbookOptions {
  baseTokenDecimals?: number,
  quoteTokenDecimals?: number
}

export interface ExchangeTx extends TxObject {
  makerMaxFees: Amount,
  makerPath: string[],
  takerMaxFees: Amount,
  takerPath: string[]
}

export interface OrderOptions {
  includeFilled?: boolean,
  includeCancelled?: boolean,
  includeUnavailable?: boolean,
  makerTokenDecimals?: number,
  takerTokenDecimals?: number
}
