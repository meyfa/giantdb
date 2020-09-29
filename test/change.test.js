'use strict'

const chai = require('chai')
chai.use(require('chai-as-promised'))
const expect = chai.expect

const PassThrough = require('stream').PassThrough
const DevNull = require('dev-null')

const Change = require('../lib/change.js')

describe('lib/change.js', function () {
  it("has property 'id'", function () {
    const out = new DevNull()
    const obj = new Change('foo', out, () => {}, () => {})
    return expect(obj.id).to.equal('foo')
  })

  describe('#write()', function () {
    it('destroys on write error', function (done) {
      const out = new DevNull({
        write: (ch, enc, cb) => cb(new Error('oops!'))
      })
      const obj = new Change('foo', out, () => {}, () => done())
      obj.write('data')
    })
  })

  describe('#end()', function () {
    it('does not destroy', function (done) {
      const out = new DevNull()
      const obj = new Change('foo', out, () => {}, () => expect.fail())
      obj.on('finish', function () {
        expect(obj.destroyed).to.be.false
        done()
      })
      obj.end()
    })
  })

  describe('#commit()', function () {
    it('ends itself', function (done) {
      const out = new DevNull()
      const obj = new Change('foo', out, () => {}, () => {})
      obj.on('finish', done)
      obj.commit()
    })

    it('returns a promise', function () {
      const out = new DevNull()
      const obj = new Change('foo', out, () => {}, () => {})
      return expect(obj.commit()).to.eventually.be.fulfilled
    })

    it('invokes the committer', function (done) {
      const out = new DevNull()
      const obj = new Change('foo', out, () => done(), () => {})
      obj.commit()
    })

    it("resolves to the committer's return value", function () {
      const out = new DevNull()
      const obj = new Change('foo', out, () => 42, () => {})
      return expect(obj.commit()).to.eventually.equal(42)
    })

    it('rejects when called twice', function () {
      const out = new DevNull()
      const obj = new Change('foo', out, () => {}, () => {})
      obj.commit()
      return expect(obj.commit()).to.eventually.be.rejectedWith('invalid state')
    })

    it('rejects when already destroyed', function (done) {
      const out = new DevNull({
        write: (ch, enc, cb) => cb(new Error('oops!'))
      })
      const obj = new Change('foo', out, () => {}, () => {})
      obj.on('error', function () {
        expect(obj.commit()).to.eventually.be.rejectedWith('invalid state')
          .notify(done)
      })
      obj.end('some data to trigger write error')
    })

    it('rejects when the underlying stream fails', function () {
      const out = new PassThrough()
      out.end = () => out.emit('error', new Error('oops!'))
      const obj = new Change('foo', out, () => {}, () => {})
      return expect(obj.commit()).to.eventually.be.rejectedWith('oops!')
    })

    it('invokes the destroyer when the underlying stream fails', function (done) {
      const out = new PassThrough()
      out.end = () => out.emit('error', new Error('oops!'))
      const obj = new Change('foo', out, () => {}, () => done())
      obj.commit().catch(() => {})
    })

    it('resolves even if end() has already been called', function (done) {
      const out = new DevNull()
      const obj = new Change('foo', out, () => {}, () => {})
      obj.on('finish', function () {
        expect(obj.commit()).to.eventually.be.fulfilled.notify(done)
      })
      obj.end()
    })
  })
})
