import { MemoryAdapter } from 'fs-adapters'
import { PassThrough } from 'stream'
import { MiddlewareManager } from '../lib/middleware/manager'
import { IOManager } from '../lib/iomanager'

import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
chai.use(chaiAsPromised)

/**
 * @returns Mock middleware manager.
 */
function mockMiddlewareManager (): MiddlewareManager {
  const manager = new MiddlewareManager()
  manager.transformReadable = async (stream, meta/*, options */) => {
    return {
      stream: stream,
      metadata: meta,
      metadataChanged: false
    }
  }
  manager.transformWritable = async (stream, meta/*, options */) => {
    return {
      stream: stream,
      metadata: meta,
      metadataChanged: false
    }
  }
  return manager
}

describe('lib/iomanager.ts', function () {
  describe('#createReadStream()', function () {
    it('gets a stream from the adapter', function (done) {
      const adapter = new MemoryAdapter({
        foo: Buffer.from('test')
      })
      const obj = new IOManager(adapter, mockMiddlewareManager())
      void expect(obj.createReadStream('foo', {}, {})).to.eventually.have.property('stream').then(stream => {
        stream.on('data', (chunk: Buffer) => {
          void expect(chunk.toString()).to.equal('test')
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
      middlewareManager.transformReadable = async function (stream, meta, opts) {
        return await Promise.all([
          new Promise<void>(resolve => {
            stream.on('data', chunk => {
              expect(chunk).to.satisfy((c: Buffer) => Buffer.from('test').equals(c))
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

    it('writes metadata if changed by middleware', async function () {
      const adapter = new MemoryAdapter({
        foo: Buffer.alloc(0)
      })

      const middlewareManager = mockMiddlewareManager()
      middlewareManager.transformReadable = async function () {
        return {
          stream: new PassThrough(),
          metadata: { passTest: true },
          metadataChanged: true
        }
      }

      const obj = new IOManager(adapter, middlewareManager)
      return await obj.createReadStream('foo', {}, {}).then(() => {
        return expect(adapter.read('foo.json', 'utf8'))
          .to.eventually.equal('{"passTest":true}')
      })
    })
  })

  describe('#createWriteStream()', function () {
    it('gets a stream from the adapter', function (done) {
      const adapter = new MemoryAdapter()
      const obj = new IOManager(adapter, mockMiddlewareManager())
      void expect(obj.createWriteStream('foo', {}, {})).to.eventually.be.fulfilled.then(result => {
        result.stream.on('finish', () => {
          void expect(adapter.read('foo', 'utf8')).to.eventually.equal('passTest')
            .notify(done)
        })
        result.stream.end('passTest')
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
      middlewareManager.transformWritable = async function (stream, meta, opts) {
        return await Promise.all([
          expect(stream).to.be.an('object'),
          expect(meta).to.equal(meta1),
          expect(opts).to.equal(options)
        ]).then(() => middlewareResult)
      }

      const obj = new IOManager(adapter, middlewareManager)
      return expect(obj.createWriteStream('foo', meta1, options))
        .to.eventually.deep.equal(middlewareResult)
    })

    it('writes metadata if changed by middleware', async function () {
      const adapter = new MemoryAdapter()

      const middlewareManager = mockMiddlewareManager()
      middlewareManager.transformWritable = async function () {
        return {
          stream: new PassThrough(),
          metadata: { passTest: true },
          metadataChanged: true
        }
      }

      const obj = new IOManager(adapter, middlewareManager)
      return await obj.createWriteStream('foo', {}, {}).then(() => {
        return expect(adapter.read('foo.json', 'utf8'))
          .to.eventually.equal('{"passTest":true}')
      })
    })
  })

  describe('#createTemporary()', function () {
    it('gets a stream from the adapter', function (done) {
      const adapter = new MemoryAdapter()
      const obj = new IOManager(adapter, mockMiddlewareManager())
      void expect(obj.createTemporary('foo', {})).to.eventually.be.fulfilled.then(stream => {
        stream.on('finish', () => {
          void expect(adapter.read('foo.tmp', 'utf8')).to.eventually.equal('passTest')
            .notify(done)
        })
        stream.end('passTest')
      })
    })

    it('applies the middleware', function () {
      const stream2 = new PassThrough()
      const metadata = { meta: true }
      const options = { options: true }

      const adapter = new MemoryAdapter()

      const middlewareManager = mockMiddlewareManager()
      middlewareManager.transformWritable = async function (stream, meta, opts) {
        expect(stream).to.be.an('object')
        expect(meta).to.deep.equal({})
        expect(opts).to.equal(options)

        return {
          stream: stream2,
          metadata: metadata,
          metadataChanged: true
        }
      }

      const obj = new IOManager(adapter, middlewareManager)
      return expect(obj.createTemporary('foo', options))
        .to.eventually.equal(stream2)
    })

    it('writes metadata', function () {
      const adapter = new MemoryAdapter()
      const obj = new IOManager(adapter, mockMiddlewareManager())
      return expect(obj.createTemporary('foo', {})).to.eventually.be.fulfilled.then(() => {
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
          throw Object.assign(new Error('no permission'), { code: 'EPERM' })
        }
        return await _oldDelete(id)
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
