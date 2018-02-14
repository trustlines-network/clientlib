import { BigNumber } from 'bignumber.js'

export interface EventFilterOptions {
  type?: string,
  fromBlock?: number,
  toBlock?: number
}

export interface Order {
  maker: string // this.user.address
  taker: string // optional
  makerFee: BigNumber
  takerFee: BigNumber
  makerTokenAmount: BigNumber // required
  takerTokenAmount: BigNumber // required
  makerTokenAddress: string // required
  takerTokenAddress: string // required
  salt: BigNumber
  exchangeContractAddress: string
  feeRecipient: string
  expirationUnixTimestampSec: BigNumber
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
	 takerTokenAmount: BigNumber,
}

export interface FeesResponse {
	 feeRecipient: string,
	 makerFee: BigNumber,
	 takerFee: BigNumber,
}