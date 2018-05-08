import 'mocha'
import * as chai from 'chai'
import * as chaiAsPromised from 'chai-as-promised'
import TLNetwork from '../../src/TLNetwork'
import { config, keystore1, user1 } from '../Fixtures'

chai.use(chaiAsPromised)

describe('e2e', () => {
  describe('User', () => {
    const { expect } = chai
    const tlNew = new TLNetwork(config)
    const tlExisting = new TLNetwork(config)
    let newUser
    let existingUser

    before(done => {
      Promise.all([tlNew.user.create(), tlExisting.user.load(keystore1)])
        .then(users => {
          newUser = users[0]
          existingUser = users[1]
          tlExisting.user.requestEth().then(() => done())
        })
    })

    describe('#getBalance()', () => {
      it('should return 0 balance for newly created user', done => {
        tlNew.user.getBalance().then(balance => {
          expect(balance).to.have.keys('raw', 'value', 'decimals')
          expect(balance.value).to.equal(0)
          done()
        })
      })

      it('should return balance for existing user', done => {
        tlExisting.user.getBalance().then(balance => {
          expect(balance).to.have.keys('raw', 'value', 'decimals')
          expect(balance.value).to.be.above(0)
          done()
        })
      })
    })

    describe('#requestEth()', () => {
      it('should not send eth to existing user', () => {
        expect(tlExisting.user.requestEth()).to.eventually.equal(null)
      })

      it('should send eth to new user', () => {
        expect(tlNew.user.requestEth()).to.eventually.not.equal(null)
        setTimeout(() => {
          expect(tlNew.user.getBalance()).to.eventually.not.equal('0')
        }, 500)
      })
    })
  })
})
