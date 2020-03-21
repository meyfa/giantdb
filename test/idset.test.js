'use strict'

const Promise = require('bluebird')

const chai = require('chai')
chai.use(require('chai-as-promised'))
const expect = chai.expect

const IdSet = require('../lib/idset.js')

describe('lib/idset.js', function () {
  describe('#add()', function () {
    it('returns a promise', function () {
      const obj = new IdSet(() => ['AB', 'CD'])
      return expect(obj.add('EF')).to.eventually.be.fulfilled
    })
  })

  describe('#remove()', function () {
    it('returns a promise', function () {
      const obj = new IdSet(() => ['AB', 'CD'])
      return expect(obj.remove('AB')).to.eventually.be.fulfilled
    })
  })

  describe('#includes()', function () {
    it('finds loaded ids', function () {
      const obj = new IdSet(() => ['AB', 'CD'])
      return expect(obj.includes('AB')).to.eventually.be.true
    })

    it('finds added ids', function () {
      const obj = new IdSet(() => ['AB', 'CD'])
      return obj.add('EF').then(function () {
        return expect(obj.includes('EF')).to.eventually.be.true
      })
    })

    it('gives false for missing ids', function () {
      const obj = new IdSet(() => ['AB', 'CD'])
      return expect(obj.includes('EF')).to.eventually.be.false
    })

    it('gives false for removed ids', function () {
      const obj = new IdSet(() => ['AB', 'CD'])
      return obj.remove('AB').then(function () {
        return expect(obj.includes('AB')).to.eventually.be.false
      })
    })
  })

  describe('#each()', function () {
    it('iterates over all items', function (done) {
      const obj = new IdSet(() => ['AB', 'CD', 'EF'])
      const parameters = []
      obj.each((id) => {
        parameters.push(id)
        if (parameters.length >= 3) {
          expect(parameters).to.have.members(['AB', 'CD', 'EF'])
          done()
        }
      })
    })

    it('returns a Promise', function () {
      const obj = new IdSet(() => ['AB', 'CD', 'EF'])
      return expect(obj.each(() => {})).to.eventually.be.fulfilled
    })

    it('fulfills the Promise after all iterations are done', function () {
      const obj = new IdSet(() => ['AB', 'CD', 'EF'])
      let iterations = 0
      return obj.each(() => ++iterations).then(() => {
        return expect(iterations).to.equal(3)
      })
    })

    it('awaits Promises returned by the callback', function (done) {
      const obj = new IdSet(() => ['AB', 'CD'])
      let first = true
      let finished = false
      obj.each(() => {
        if (first) {
          first = false
          return Promise.delay(20).then(() => {
            finished = true
          })
        }
        expect(finished).to.be.true
        done()
      })
    })

    it('allows for element removal', function () {
      const obj = new IdSet(() => ['AB', 'CD', 'EF'])
      let removed = null
      obj.each((id) => {
        if (!removed) {
          // pick any item other than the current
          removed = id === 'AB' ? 'CD' : 'AB'
          return obj.remove(removed)
        }
        expect(id).to.not.equal(removed)
      })
    })
  })
})
