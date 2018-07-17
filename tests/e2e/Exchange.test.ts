import 'mocha'
import * as chai from 'chai'
import * as chaiAsPromised from 'chai-as-promised'
import { BigNumber } from 'bignumber.js'

import { TLNetwork } from '../../src/TLNetwork'
import { config, keystore1, keystore2, wait } from '../Fixtures'

chai.use(chaiAsPromised)

describe('e2e', () => {
  describe('Exchange', () => {
    const { expect } = chai
    const tl1 = new TLNetwork(config)
    const tl2 = new TLNetwork(config)
    let user1
    let user2
    let networks
    let exchangeAddress
    let dummyTokenAddress
    let makerTokenAddress
    let takerTokenAddress
    let latestOrder

    before(async () => {
      // load users, set exchange address and maker, taker tokens
      [ user1, user2, [ exchangeAddress ], networks ] = await Promise.all([
        tl1.user.load(keystore1),
        tl2.user.load(keystore2),
        tl1.exchange.getExAddresses(),
        tl1.currencyNetwork.getAll()
      ])
      const [ network1, network2 ] = networks.filter(n => n.decimals===2)
      makerTokenAddress = network1.address
      takerTokenAddress = network2.address
      // make sure users have eth
      await Promise.all([
        tl1.user.requestEth(),
        tl2.user.requestEth()
      ])
      await wait()
      const [ tx1, tx2 ] = await Promise.all([
        // set trustlines in maker token
        tl1.trustline.prepareUpdate(makerTokenAddress, user2.address, 100, 200),
        tl2.trustline.prepareAccept(makerTokenAddress, user1.address, 200, 100)
      ])
      await Promise.all([
        tl1.trustline.confirm(tx1.rawTx),
        tl2.trustline.confirm(tx2.rawTx)
      ])
      await wait()
      const [ tx3, tx4 ] = await Promise.all([
        // set trustlines in taker token
        tl1.trustline.prepareUpdate(takerTokenAddress, user2.address, 300, 400),
        tl2.trustline.prepareAccept(takerTokenAddress, user1.address, 400, 300)
      ])
      await Promise.all([
        tl1.trustline.confirm(tx3.rawTx),
        tl2.trustline.confirm(tx4.rawTx)
      ])
      await wait()
    })

    describe('#getExAddresses()', () => {
      it('should return array', () => {
        expect(tl1.exchange.getExAddresses()).to.eventually.be.an('array')
      })
    })

    describe('#getOrderbook()', () => {
      it('should return orderbook', () => {
        expect(tl1.exchange.getOrderbook(makerTokenAddress, takerTokenAddress))
          .to.eventually.have.keys('asks', 'bids')
      })
    })

    describe('#makeOrder()', () => {
      it('should make order', async () => {
        const makerTokenValue = 1000
        const takerTokenValue = 2000
        const order = await tl1.exchange.makeOrder(
          exchangeAddress,
          makerTokenAddress,
          takerTokenAddress,
          makerTokenValue,
          takerTokenValue
        )
        expect(order.exchangeContractAddress).to.equal(exchangeAddress)
        expect(order.maker).to.equal(tl1.user.address)
        expect(order.makerTokenAddress).to.equal(makerTokenAddress)
        expect(order.takerTokenAddress).to.equal(takerTokenAddress)
        expect(order.makerTokenAmount).to.have.keys('raw', 'value', 'decimals')
        expect(order.makerTokenAmount.value).to.equal(new BigNumber(makerTokenValue).toString())
        expect(order.makerTokenAmount.decimals).to.equal(2)
        expect(order.takerTokenAmount).to.have.keys('raw', 'value', 'decimals')
        expect(order.takerTokenAmount.value).to.equal(new BigNumber(takerTokenValue).toString())
        expect(order.takerTokenAmount.decimals).to.equal(2)
        expect(order.salt).to.be.a('string')
        expect(order.expirationUnixTimestampSec).to.be.a('string')
        expect(order.ecSignature).to.have.keys('r', 's', 'v')
      })
    })

    describe('#getOrderByHash()', () => {
      const makerTokenValue = 1000
      const takerTokenValue = 2000
      let madeOrder

      before(async () => {
        madeOrder = await tl1.exchange.makeOrder(
          exchangeAddress,
          makerTokenAddress,
          takerTokenAddress,
          makerTokenValue,
          takerTokenValue
        )
      })

      it('should return order by its hash', async () => {
        const returnedOrder = await tl1.exchange.getOrderByHash(madeOrder.hash)
        expect({
          ...returnedOrder,
          hash: madeOrder.hash
        }).to.deep.equal(madeOrder)
      })
    })

    describe('#prepTakeOrder()', () => {
      let order

      before(async () => {
        order = await tl1.exchange.makeOrder(
          exchangeAddress,
          makerTokenAddress,
          takerTokenAddress,
          1,
          2
        )
      })

      it('should prepare a fill order tx for latest order', () => {
        expect(tl2.exchange.prepTakeOrder(order, 1))
          .to.eventually.have.keys(
            'rawTx',
            'ethFees',
            'makerMaxFees',
            'makerPath',
            'takerMaxFees',
            'takerPath'
          )
      })
    })

    describe.skip('#confirm() - TL money <-> TL money', () => {
      let makerTLBefore
      let takerTLBefore

      before(done => {
        tl1.exchange.makeOrder(exchangeAddress, makerTokenAddress, takerTokenAddress, 1, 1)
          .then(order => latestOrder = order)
          .then(() => Promise.all([
            tl2.trustline.getAll(makerTokenAddress),
            tl2.trustline.getAll(takerTokenAddress)
          ])
          .then(([ makerTrustlines, takerTrustlines ]) => {
            makerTLBefore = makerTrustlines.find(tl => tl.address === tl1.user.address)
            takerTLBefore = takerTrustlines.find(tl => tl.address === tl1.user.address)
            done()
          }))
          .catch(e => done(e))
      })

      it('should confirm a signed fill order tx for TL money <-> TL money order', done => {
        tl2.exchange.prepTakeOrder(latestOrder, 0.5)
          .then(tx => tl2.exchange.confirm(tx.rawTx))
          .then(txId => {
            setTimeout(() => {
              expect(txId).to.be.a('string')
              Promise.all([
                tl2.trustline.getAll(makerTokenAddress),
                tl2.trustline.getAll(takerTokenAddress)
              ]).then(([ makerTrustlines, takerTrustlines ]) => {
                const makerTLAfter = makerTrustlines.find(tl => tl.address === tl1.user.address)
                const takerTLAfter = takerTrustlines.find(tl => tl.address === tl1.user.address)
                const makerBalanceDelta = Math.abs(
                  parseInt(makerTLBefore.balance.raw, 10) - parseInt(makerTLAfter.balance.raw, 10)
                )
                const takerBalanceDelta = Math.abs(
                  parseInt(takerTLBefore.balance.raw, 10) - parseInt(takerTLAfter.balance.raw, 10)
                )
                expect(makerTLAfter.balance.raw).to.be.above(0)
                expect(takerTLAfter.balance.raw).to.be.below(0)
                expect(makerBalanceDelta).to.equal(takerBalanceDelta)
                done()
              })
            }, 3000)
          })
      })
    })

    // TODO scenario for TL money <-> token
    describe.skip('#confirm() - TL money <-> token', () => {
      let makerTLBefore
      let tokenBalanceBefore

      before(done => {
        tl1.exchange.makeOrder(exchangeAddress, makerTokenAddress, dummyTokenAddress, 1, 1, {
          makerTokenDecimals: 2,
          takerTokenDecimals: 2
        })
          .then(() => tl1.exchange.getOrderbook(makerTokenAddress, dummyTokenAddress, {
            baseTokenDecimals: 2,
            quoteTokenDecimals: 2
          }))
          .then(orderbook => latestOrder = orderbook.asks[orderbook.asks.length - 1])
          .then(() => Promise.all([
            tl2.trustline.getAll(makerTokenAddress)
            // TODO get balance of dummy token
          ])
          .then(([ makerTrustlines ]) => {
            makerTLBefore = makerTrustlines.find(tl => tl.address === tl1.user.address)
            tokenBalanceBefore = 0
            done()
          }))
          .catch(e => done(e))
      })

      it('should confirm a signed fill order tx for TL money <-> TL money order', done => {
        tl2.exchange.prepTakeOrder(latestOrder, 0.5)
        .then(tx => tl2.exchange.confirm(tx.rawTx))
        .then(txId => {
          setTimeout(() => {
            expect(txId).to.be.a('string')
            Promise.all([
              tl2.trustline.getAll(makerTokenAddress)
              // TODO get dummy token balance
            ]).then(([ makerTrustlines ]) => {
              const makerTLAfter = makerTrustlines.find(tl => tl.address === tl1.user.address)
              const tokenBalanceAfter = 1
              const makerBalanceDelta = Math.abs(
                parseInt(makerTLBefore.balance.value, 10) - parseInt(makerTLAfter.balance.value, 10)
              )
              const tokenBalanceDelta = Math.abs(tokenBalanceBefore - tokenBalanceAfter)
              expect(makerTLAfter.balance.value).to.be.above(0)
              expect(tokenBalanceAfter).to.be.below(0)
              expect(makerBalanceDelta).to.equal(tokenBalanceDelta)
              done()
            })
          }, 1000)
        })
      })
    })
  })
})
