import 'mocha'
import * as chai from 'chai'
import * as chaiAsPromised from 'chai-as-promised'
import { TLNetwork } from '../../src/TLNetwork'
import { config, keystore1, user1, keystore2 } from '../Fixtures'

chai.use(chaiAsPromised)

describe('e2e', () => {
  describe('Exchange', () => {
    const { expect } = chai
    const tl1 = new TLNetwork(config)
    const tl2 = new TLNetwork(config)
    let user1
    let user2
    let exchangeAddress
    let dummyTokenAddress
    let makerTokenAddress
    let takerTokenAddress
    let latestOrder

    before(done => {
      // load users
      Promise.all([tl1.user.load(keystore1), tl2.user.load(keystore2)])
        .then(users => [ user1, user2 ] = users)
        // get availabe exchange contracts
        .then(() => tl1.exchange.getExchanges())
        .then(exchanges => {
          exchangeAddress = exchanges[0]
        })
        // get all currency networks
        .then(() => tl1.currencyNetwork.getAll())
        .then(networks => {
          const [ x, y ] = networks.filter(n => n.abbreviation === 'EUR' || n.abbreviation === 'USD')
          makerTokenAddress = x.address
          takerTokenAddress = y.address
        })
        // make sure users have eth
        .then(() => Promise.all([tl1.user.requestEth(), tl2.user.requestEth()]))
        // set up trustline in maker token network
        .then(() => Promise.all([
          tl1.trustline.prepareUpdate(makerTokenAddress, user2.address, 100, 200),
          tl2.trustline.prepareAccept(makerTokenAddress, user1.address, 200, 100)
        ]))
        .then(([ tx1, tx2 ]) => Promise.all([
          tl1.trustline.confirm(tx1.rawTx),
          tl2.trustline.confirm(tx2.rawTx)
        ]))
        // wait for txs to be mined
        .then(() => new Promise(resolve => setTimeout(resolve, 1000)))
        // set trustline in taker token network
        .then(() => Promise.all([
          tl1.trustline.prepareUpdate(takerTokenAddress, user2.address, 300, 400),
          tl2.trustline.prepareAccept(takerTokenAddress, user1.address, 400, 300)
        ]))
        .then(([ tx1, tx2 ]) => Promise.all([
          tl1.trustline.confirm(tx1.rawTx),
          tl2.trustline.confirm(tx2.rawTx)
        ]))
        // wait for txs to be mined
        .then(() => new Promise(resolve => setTimeout(resolve, 1000)))
        .then(() => done())
    })

    describe('#getExchanges()', () => {
      it('should return array', () => {
        expect(tl1.exchange.getExchanges()).to.eventually.be.an('array')
      })
    })

    describe('#getEthWrappers()', () => {
      it('should return array', () => {
        expect(tl1.exchange.getEthWrappers()).to.eventually.be.an('array')
      })
    })

    describe('#getOrderbook()', () => {
      it('should return orderbook', () => {
        expect(tl1.exchange.getOrderbook(makerTokenAddress, takerTokenAddress))
          .to.eventually.have.keys('asks', 'bids')
      })
    })

    describe('#makeOrder()', () => {
      it('should make order', done => {
        tl1.exchange.makeOrder(
          exchangeAddress,
          makerTokenAddress,
          takerTokenAddress,
          1000,
          2000
        ).then(order => {
          expect(order.exchangeContractAddress).to.equal(exchangeAddress)
          expect(order.maker).to.equal(tl1.user.address)
          expect(order.makerTokenAddress).to.equal(makerTokenAddress)
          expect(order.takerTokenAddress).to.equal(takerTokenAddress)
          expect(order.makerTokenAmount).to.have.keys('raw', 'value', 'decimals')
          expect(order.takerTokenAmount).to.have.keys('raw', 'value', 'decimals')
          expect(order.salt).to.be.a('string')
          expect(order.expirationUnixTimestampSec).to.be.a('string')
          expect(order.ecSignature).to.have.keys('r', 's', 'v')
          done()
        })
      })
    })

    describe('#prepTakeOrder()', () => {
      before(done => {
        tl1.exchange.makeOrder(exchangeAddress, makerTokenAddress, takerTokenAddress, 1, 2)
          .then(order => latestOrder = order)
          .then(() => done())
          .catch(e => done(e))
      })

      it('should prepare a fill order tx for latest order', () => {
        expect(tl2.exchange.prepTakeOrder(latestOrder, 1))
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

    describe('#confirm() - TL money <-> TL money', () => {
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
                const makerBalanceDelta = Math.abs(makerTLBefore.balance.raw - makerTLAfter.balance.raw)
                const takerBalanceDelta = Math.abs(takerTLBefore.balance.raw - takerTLAfter.balance.raw)
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
              const makerBalanceDelta = Math.abs(makerTLBefore.balance.value - makerTLAfter.balance.value)
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
