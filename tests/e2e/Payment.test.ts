import 'mocha'
import * as chai from 'chai'
import * as chaiAsPromised from 'chai-as-promised'
import { TLNetwork } from '../../src/TLNetwork'
import { config, keystore1, keystore2 } from '../Fixtures'

chai.use(chaiAsPromised)

describe('e2e', () => {
  describe('Payment', () => {
    const { expect } = chai
    const { currencyNetwork } = new TLNetwork(config)
    const tl1 = new TLNetwork(config)
    const tl2 = new TLNetwork(config)
    let user1
    let user2
    let networkAddress
    let tx
    let txId

    before(done => {
      tl1.currencyNetwork.getAll()
        .then(results => networkAddress = results[0].address)
        // load users
        .then(() => Promise.all([tl1.user.load(keystore1), tl2.user.load(keystore2)]))
        .then(users => [ user1, user2 ] = users)
        // make sure users have eth
        .then(() => Promise.all([tl1.user.requestEth(), tl2.user.requestEth()]))
        // set up trustlines requests
        .then(() => Promise.all([
          tl1.trustline.prepareUpdate(networkAddress, user2.address, 1000),
          tl2.trustline.prepareUpdate(networkAddress, user1.address, 500)
        ]))
        .then(([ tx1, tx2 ]) => Promise.all([
          tl1.trustline.confirm(tx1.rawTx),
          tl2.trustline.confirm(tx2.rawTx)
        ]))
        // wait for txs to be mined
        .then(() => new Promise(resolve => setTimeout(resolve, 1000)))
        // set trustline accepts
        .then(() => Promise.all([
          tl1.trustline.prepareAccept(networkAddress, user2.address, 500),
          tl2.trustline.prepareAccept(networkAddress, user1.address, 1000)
        ]))
        .then(([ tx1, tx2 ]) => Promise.all([
          tl1.trustline.confirm(tx1.rawTx),
          tl2.trustline.confirm(tx2.rawTx)
        ]))
        // wait for txs to be mined
        .then(() => new Promise(resolve => setTimeout(resolve, 1000)))
        .then(() => done())
    })

    describe('#getPath()', () => {
      it('should return path', done => {
        tl1.payment.getPath(networkAddress, user1.address, user2.address, 100)
          .then(pathObj => {
            expect(pathObj.estimatedGas).to.not.equal(0)
            expect(pathObj.fees).to.not.equal(0)
            expect(pathObj.path).to.not.equal([])
            done()
          })
      })

      it('should return no path', done => {
        tl1.payment.getPath(networkAddress, user1.address, user2.address, 1000)
          .then(pathObj => {
            expect(pathObj.estimatedGas).to.equal(0)
            expect(pathObj.fees).to.equal(0)
            expect(pathObj.path).to.deep.equal([])
            done()
          })
      })
    })

    describe('#prepare()', () => {
      it('should prepare tx for transfer', () => {
        expect(tl1.payment.prepare(networkAddress, user2.address, 100))
          .to.eventually.have.keys('rawTx', 'ethFee', 'maxFee', 'path')
      })
    })

    describe('#confirm()', () => {
      it('should confirm transfer', done => {
        tl1.payment.prepare(networkAddress, user2.address, 10)
          .then(({ rawTx }) => tl1.payment.confirm(rawTx))
          .then(txId => {
            expect(txId).to.be.a('string')
            done()
          })
      })
    })

    describe('#get()', () => {
      before(done => {
        tl1.payment.prepare(networkAddress, user2.address, 15)
          .then(({ rawTx }) => tl1.payment.confirm(rawTx))
          .then(() => setTimeout(() => done(), 500))
      })

      it('should return all transfers', () => {
        expect(tl1.payment.get(networkAddress)).to.eventually.be.an('array')
      })

      it('should return latest transfer', done => {
        tl1.payment.get(networkAddress)
          .then(transfers => {
            const latestTransfer = transfers[transfers.length - 1]
            expect(latestTransfer.address).to.be.a('string')
            expect(latestTransfer.amount).to.equal(15)
            expect(latestTransfer.blockNumber).to.be.a('number')
            expect(latestTransfer.direction).to.equal('sent')
            expect(latestTransfer.networkAddress).to.be.a('string')
            expect(latestTransfer.status).to.be.a('string')
            expect(latestTransfer.timestamp).to.be.a('number')
            expect(latestTransfer.transactionId).to.be.a('string')
            expect(latestTransfer.type).to.equal('Transfer')
            done()
          })
      })
    })
  })
})