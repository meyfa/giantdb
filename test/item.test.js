'use strict'

const chai = require('chai')
chai.use(require('chai-as-promised'))
const expect = chai.expect

const PassThrough = require('stream').PassThrough

const Item = require('../lib/item.js')

describe('lib/item.js', function () {
  it("has property 'id'", function () {
    const obj = new Item('foo', {}, {})
    return expect(obj.id).to.equal('foo')
  })

  it("has property 'metadata'", function () {
    const metadata = { foo: 'bar', baz: 42 }
    const obj = new Item('foo', {}, metadata)
    return expect(obj.metadata).to.equal(metadata)
  })

  describe('#getReadable()', function () {
    it('gets a stream from the IO manager', function () {
      const expected = {}
      const manager = {
        createReadStream () {
          return Promise.resolve({
            metadata: {},
            metadataChanged: false,
            stream: expected
          })
        }
      }
      const obj = new Item('foo', manager, {})
      expect(obj.getReadable()).to.eventually.equal(expected)
    })

    it('passes id, metadata and options to the IO manager', function (done) {
      const metadata = { meta: true }
      const expectedOptions = { options: true }
      const manager = {
        createReadStream (id, meta, options) {
          expect(id).to.equal('foo')
          expect(meta).to.equal(metadata)
          expect(options).to.equal(expectedOptions)
          done()
          return Promise.resolve({
            metadata: {},
            metadataChanged: false,
            stream: new PassThrough()
          })
        }
      }
      const obj = new Item('foo', manager, metadata)
      obj.getReadable(expectedOptions)
    })

    it('updates its metadata when changed', function () {
      const expected = { meta: true, changed: true }
      const manager = {
        createReadStream () {
          return Promise.resolve({
            metadata: expected,
            metadataChanged: true,
            stream: new PassThrough()
          })
        }
      }
      const obj = new Item('foo', manager, {})
      return obj.getReadable().then(() => {
        return expect(obj.metadata).to.equal(expected)
      })
    })
  })

  describe('#getWritable()', function () {
    it('gets a stream from the IO manager', function () {
      const expected = {}
      const manager = {
        createWriteStream () {
          return Promise.resolve({
            metadata: {},
            metadataChanged: false,
            stream: expected
          })
        }
      }
      const obj = new Item('foo', manager, {})
      expect(obj.getWritable()).to.eventually.equal(expected)
    })

    it('passes id, metadata and options to the IO manager', function (done) {
      const metadata = { meta: true }
      const expectedOptions = { options: true }
      const manager = {
        createWriteStream (id, meta, options) {
          expect(id).to.equal('foo')
          expect(meta).to.equal(metadata)
          expect(options).to.equal(expectedOptions)
          done()
          return Promise.resolve({
            metadata: {},
            metadataChanged: false,
            stream: new PassThrough()
          })
        }
      }
      const obj = new Item('foo', manager, metadata)
      obj.getWritable(expectedOptions)
    })

    it('updates its metadata when changed', function () {
      const expected = { meta: true, changed: true }
      const manager = {
        createWriteStream () {
          return Promise.resolve({
            metadata: expected,
            metadataChanged: true,
            stream: new PassThrough()
          })
        }
      }
      const obj = new Item('foo', manager, {})
      return obj.getWritable().then(() => {
        return expect(obj.metadata).to.equal(expected)
      })
    })
  })

  describe('#saveMetadata()', function () {
    it("calls the I/O manager's 'writeMetadata' method", function (done) {
      const expected = {
        foo: 'bar',
        baz: 42
      }
      const manager = {
        writeMetadata (id, data) {
          expect(id).to.equal('foo')
          expect(data).to.equal(expected)
          done()
          return Promise.resolve()
        }
      }
      const obj = new Item('foo', manager, expected)
      obj.saveMetadata()
    })

    it('returns a Promise', function () {
      const manager = {
        writeMetadata () {
          return Promise.resolve()
        }
      }
      const obj = new Item('foo', manager, {})
      return expect(obj.saveMetadata()).to.eventually.be.fulfilled
    })
  })
})
