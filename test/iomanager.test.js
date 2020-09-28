'use strict'

const chai = require('chai')
chai.use(require('chai-as-promised'))
const expect = chai.expect

const { MemoryAdapter } = require('fs-adapters')
const PassThrough = require('stream').PassThrough

const IOManager = require('../lib/iomanager.js')

/**
 * @returns {object} Mock middleware manager.
 */
function mockMiddlewareManager () {
  return {
    transformReadable (stream, meta/*, options */) {
      return {
        stream: stream,
        metadata: meta,
        metadataChanged: false
      }
    },
    transformWritable (stream, meta/*, options */) {
      return {
        stream: stream,
        metadata: meta,
        metadataChanged: false
      }
    }
  }
}

describe('lib/iomanager.js', function () {
  describe('#createReadStream()', function () {
    it('gets a stream from the adapter', function (done) {
      const adapter = new MemoryAdapter({
        foo: Buffer.from('test')
      })
      const obj = new IOManager(adapter, mockMiddlewareManager())
      expect(obj.createReadStream('foo')).to.eventually.have.property('stream').then(stream => {
        stream.on('data', chunk => {
          expect(chunk.toString()).to.equal('test')
          done()
        })
      })
    })

    it('applies the middleware', function () {
      const meta1 = { meta: true }
      const options = { options: true }

      const middlewareResult = {
        stream: new PassThrough(),
        metadata: { meta: true, ordinal: 2 },
        metadataChanged: true
      }

      const adapter = new MemoryAdapter({
        foo: Buffer.from('test')
      })

      const middlewareManager = mockMiddlewareManager()
      middlewareManager.transformReadable = function (stream, meta, opts) {
        return Promise.all([
          new Promise(resolve => {
            stream.on('data', chunk => {
              expect(chunk).to.satisfy(c => Buffer.from('test').equals(c))
              resolve()
            })
          }),
          expect(meta).to.equal(meta1),
          expect(opts).to.equal(options)
        ]).then(() => middlewareResult)
      }

      const obj = new IOManager(adapter, middlewareManager)
      return expect(obj.createReadStream('foo', meta1, options))
        .to.eventually.deep.equal(middlewareResult)
    })

    it('writes metadata if changed by middleware', function () {
      const adapter = new MemoryAdapter({
        foo: Buffer.alloc(0)
      })

      const middlewareManager = mockMiddlewareManager()
      middlewareManager.transformReadable = function () {
        return Promise.resolve({
          stream: new PassThrough(),
          metadata: { passTest: true },
          metadataChanged: true
        })
      }

      const obj = new IOManager(adapter, middlewareManager)
      return obj.createReadStream('foo', {}, {}).then(() => {
        return expect(adapter.read('foo.json', 'utf8'))
          .to.eventually.equal('{"passTest":true}')
      })
    })
  })

  describe('#createWriteStream()', function () {
    it('gets a stream from the adapter', function (done) {
      const adapter = new MemoryAdapter()
      const obj = new IOManager(adapter, mockMiddlewareManager())
      expect(obj.createWriteStream('foo')).to.eventually.be.fulfilled.then(result => {
        result.stream.end('passTest', () => {
          expect(adapter.read('foo', 'utf8')).to.eventually.equal('passTest')
            .notify(done)
        })
      })
    })

    it('applies the middleware', function () {
      const meta1 = { meta: true }
      const options = { options: true }

      const middlewareResult = {
        stream: new PassThrough(),
        metadata: { meta: true, ordinal: 2 },
        metadataChanged: true
      }

      const adapter = new MemoryAdapter()

      const middlewareManager = mockMiddlewareManager()
      middlewareManager.transformWritable = function (stream, meta, opts) {
        return Promise.all([
          expect(stream).to.be.an('object'),
          expect(meta).to.equal(meta1),
          expect(opts).to.equal(options)
        ]).then(() => middlewareResult)
      }

      const obj = new IOManager(adapter, middlewareManager)
      return expect(obj.createWriteStream('foo', meta1, options))
        .to.eventually.deep.equal(middlewareResult)
    })

    it('writes metadata if changed by middleware', function () {
      const adapter = new MemoryAdapter()

      const middlewareManager = mockMiddlewareManager()
      middlewareManager.transformWritable = function () {
        return Promise.resolve({
          stream: new PassThrough(),
          metadata: { passTest: true },
          metadataChanged: true
        })
      }

      const obj = new IOManager(adapter, middlewareManager)
      return obj.createWriteStream('foo', {}, {}).then(() => {
        return expect(adapter.read('foo.json', 'utf8'))
          .to.eventually.equal('{"passTest":true}')
      })
    })
  })

  describe('#createTemporary()', function () {
    it('gets a stream from the adapter', function (done) {
      const adapter = new MemoryAdapter()
      const obj = new IOManager(adapter, mockMiddlewareManager())
      expect(obj.createTemporary('foo', {})).to.eventually.be.fulfilled.then(stream => {
        stream.end('passTest', () => {
          expect(adapter.read('foo.tmp', 'utf8')).to.eventually.equal('passTest')
            .notify(done)
        })
      })
    })

    it('applies the middleware', function () {
      const stream2 = new PassThrough()
      const metadata = { meta: true }
      const options = { options: true }

      const adapter = new MemoryAdapter()

      const middlewareManager = mockMiddlewareManager()
      middlewareManager.transformWritable = function (stream, meta, opts) {
        expect(stream).to.be.an('object')
        expect(meta).to.deep.equal({})
        expect(opts).to.equal(options)

        return Promise.resolve({
          stream: stream2,
          metadata: metadata,
          metadataChanged: true
        })
      }

      const obj = new IOManager(adapter, middlewareManager)
      return expect(obj.createTemporary('foo', options))
        .to.eventually.equal(stream2)
    })

    it('writes metadata', function () {
      const adapter = new MemoryAdapter()
      const obj = new IOManager(adapter, mockMiddlewareManager())
      return expect(obj.createTemporary('foo')).to.eventually.be.fulfilled.then(() => {
        return expect(adapter.read('foo.json', 'utf8'))
          .to.eventually.equal('{}')
      })
    })
  })

  describe('#publish()', function () {
    it('renames foo.tmp to foo', function () {
      const adapter = new MemoryAdapter({
        'foo.tmp': Buffer.from('foo.tmp-contents'),
        'foo.json': Buffer.alloc(0)
      })
      const obj = new IOManager(adapter, mockMiddlewareManager())
      return expect(obj.publish('foo')).to.eventually.be.fulfilled.then(() => {
        return expect(adapter.listFiles())
          .to.eventually.have.members(['foo', 'foo.json'])
      }).then(() => {
        return expect(adapter.read('foo', 'utf8'))
          .to.eventually.equal('foo.tmp-contents')
      })
    })

    it('leaves metadata as-is', function () {
      const adapter = new MemoryAdapter({
        'foo.tmp': Buffer.alloc(0),
        'foo.json': Buffer.from('{"foo":"bar"}')
      })
      const obj = new IOManager(adapter, mockMiddlewareManager())
      return expect(obj.publish('foo')).to.eventually.be.fulfilled.then(() => {
        return expect(adapter.read('foo.json', 'utf8'))
          .to.eventually.equal('{"foo":"bar"}')
      })
    })
  })

  describe('#delete()', function () {
    it('deletes the file and metadata', function () {
      const adapter = new MemoryAdapter({
        foo: Buffer.alloc(0),
        'foo.json': Buffer.from('{"foo":"bar"}')
      })
      const obj = new IOManager(adapter, mockMiddlewareManager())
      return expect(obj.delete('foo')).to.eventually.be.fulfilled.then(() => {
        return expect(adapter.listFiles()).to.eventually.be.empty
      })
    })
  })

  describe('#deleteTemporary()', function () {
    it('deletes file and metadata', function () {
      const adapter = new MemoryAdapter({
        'foo.tmp': Buffer.alloc(0),
        'foo.json': Buffer.from('{}')
      })
      const obj = new IOManager(adapter, mockMiddlewareManager())
      return expect(obj.deleteTemporary('foo')).to.eventually.be.fulfilled.then(() => {
        return expect(adapter.listFiles()).to.eventually.be.empty
      })
    })

    it('ignores missing metadata file', function () {
      const adapter = new MemoryAdapter({
        'foo.tmp': Buffer.alloc(0)
      })
      const obj = new IOManager(adapter, mockMiddlewareManager())
      return expect(obj.deleteTemporary('foo')).to.eventually.be.fulfilled
    })

    it('rejects for failure to delete metadata', function () {
      const adapter = new MemoryAdapter()
      const _oldDelete = adapter.delete.bind(adapter)
      adapter.delete = async function (id) {
        if (id === 'foo.json') {
          const err = new Error('no permission')
          err.code = 'EPERM'
          throw err
        }
        return _oldDelete(id)
      }
      const obj = new IOManager(adapter, mockMiddlewareManager())
      return expect(obj.deleteTemporary('foo')).to.eventually.be.rejected
    })
  })

  describe('#readMetadata()', function () {
    it('parses the JSON file', function () {
      const adapter = new MemoryAdapter({
        'foo.json': Buffer.from('{"foo": "bar"}')
      })
      const obj = new IOManager(adapter, mockMiddlewareManager())
      return expect(obj.readMetadata('foo')).to.eventually.deep.equal({
        foo: 'bar'
      })
    })

    it('rejects on syntax error', function () {
      const adapter = new MemoryAdapter({
        'foo.json': Buffer.from('}foo')
      })
      const obj = new IOManager(adapter, mockMiddlewareManager())
      return expect(obj.readMetadata('foo')).to.eventually.be.rejected
    })
  })

  describe('#writeMetadata()', function () {
    it('writes the JSON file', function () {
      const adapter = new MemoryAdapter()
      const obj = new IOManager(adapter, mockMiddlewareManager())
      return expect(obj.writeMetadata('foo', { foo: 'bar' })).to.eventually.be.fulfilled.then(() => {
        return expect(adapter.read('foo.json', 'utf8')).to.eventually.equal('{"foo":"bar"}')
      })
    })
  })
})
