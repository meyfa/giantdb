import assert from 'node:assert'
import { MemoryAdapter } from 'fs-adapters'
import { PassThrough } from 'node:stream'
import { MiddlewareManager } from '../src/middleware/manager.js'
import { IOManager } from '../src/iomanager.js'

/**
 * @returns Mock middleware manager.
 */
function mockMiddlewareManager (): MiddlewareManager {
  const manager = new MiddlewareManager()
  manager.transformReadable = async (stream, meta/*, options */) => {
    return {
      stream,
      metadata: meta,
      metadataChanged: false
    }
  }
  manager.transformWritable = async (stream, meta/*, options */) => {
    return {
      stream,
      metadata: meta,
      metadataChanged: false
    }
  }
  return manager
}

describe('lib/iomanager.ts', function () {
  describe('#createReadStream()', function () {
    it('gets a stream from the adapter', async function () {
      const adapter = new MemoryAdapter({
        foo: Buffer.from('test')
      })
      const obj = new IOManager(adapter, mockMiddlewareManager())
      const { stream } = await obj.createReadStream('foo', {}, {})
      await new Promise<void>(resolve => {
        stream.on('data', (chunk: Buffer) => {
          assert.strictEqual(chunk.toString(), 'test')
          resolve()
        })
      })
    })

    it('applies the middleware', async function () {
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
        assert.strictEqual(meta, meta1)
        assert.strictEqual(opts, options)
        await new Promise<void>(resolve => {
          stream.on('data', chunk => {
            assert.ok(Buffer.from('test').equals(chunk))
            resolve()
          })
        })
        return middlewareResult
      }

      const obj = new IOManager(adapter, middlewareManager)
      assert.deepStrictEqual(await obj.createReadStream('foo', meta1, options), middlewareResult)
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
      await obj.createReadStream('foo', {}, {})
      assert.strictEqual(await adapter.read('foo.json', 'utf8'), '{"passTest":true}')
    })
  })

  describe('#createWriteStream()', function () {
    it('gets a stream from the adapter', async function () {
      const adapter = new MemoryAdapter()
      const obj = new IOManager(adapter, mockMiddlewareManager())
      const { stream } = await obj.createWriteStream('foo', {}, {})
      const promise = new Promise<void>(resolve => {
        stream.on('finish', () => resolve())
      })
      stream.end('passTest')
      await promise
      assert.strictEqual(await adapter.read('foo', 'utf8'), 'passTest')
    })

    it('applies the middleware', async function () {
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
        assert.strictEqual(typeof stream, 'object')
        assert.strictEqual(meta, meta1)
        assert.strictEqual(opts, options)
        return middlewareResult
      }

      const obj = new IOManager(adapter, middlewareManager)
      assert.deepStrictEqual(await obj.createWriteStream('foo', meta1, options), middlewareResult)
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
      await obj.createWriteStream('foo', {}, {})
      assert.strictEqual(await adapter.read('foo.json', 'utf8'), '{"passTest":true}')
    })
  })

  describe('#createTemporary()', function () {
    it('gets a stream from the adapter', async function () {
      const adapter = new MemoryAdapter()
      const obj = new IOManager(adapter, mockMiddlewareManager())
      const stream = await obj.createTemporary('foo', {})
      const promise = new Promise<void>(resolve => {
        stream.on('finish', () => resolve())
      })
      stream.end('passTest')
      await promise
      assert.strictEqual(await adapter.read('foo.tmp', 'utf8'), 'passTest')
    })

    it('applies the middleware', async function () {
      const stream2 = new PassThrough()
      const metadata = { meta: true }
      const options = { options: true }

      const adapter = new MemoryAdapter()

      const middlewareManager = mockMiddlewareManager()
      middlewareManager.transformWritable = async function (stream, meta, opts) {
        assert.strictEqual(typeof stream, 'object')
        assert.deepStrictEqual(meta, {})
        assert.strictEqual(opts, options)

        return {
          stream: stream2,
          metadata,
          metadataChanged: true
        }
      }

      const obj = new IOManager(adapter, middlewareManager)
      assert.strictEqual(await obj.createTemporary('foo', options), stream2)
    })

    it('writes metadata', async function () {
      const adapter = new MemoryAdapter()
      const obj = new IOManager(adapter, mockMiddlewareManager())
      await obj.createTemporary('foo', {})
      assert.strictEqual(await adapter.read('foo.json', 'utf8'), '{}')
    })
  })

  describe('#publish()', function () {
    it('renames foo.tmp to foo', async function () {
      const adapter = new MemoryAdapter({
        'foo.tmp': Buffer.from('foo.tmp-contents'),
        'foo.json': Buffer.alloc(0)
      })
      const obj = new IOManager(adapter, mockMiddlewareManager())
      await obj.publish('foo')
      const files = await adapter.listFiles()
      assert.deepStrictEqual(files.sort(), ['foo', 'foo.json'].sort())
      assert.strictEqual(await adapter.read('foo', 'utf8'), 'foo.tmp-contents')
    })

    it('leaves metadata as-is', async function () {
      const adapter = new MemoryAdapter({
        'foo.tmp': Buffer.alloc(0),
        'foo.json': Buffer.from('{"foo":"bar"}')
      })
      const obj = new IOManager(adapter, mockMiddlewareManager())
      await obj.publish('foo')
      assert.strictEqual(await adapter.read('foo.json', 'utf8'), '{"foo":"bar"}')
    })
  })

  describe('#delete()', function () {
    it('deletes the file and metadata', async function () {
      const adapter = new MemoryAdapter({
        foo: Buffer.alloc(0),
        'foo.json': Buffer.from('{"foo":"bar"}')
      })
      const obj = new IOManager(adapter, mockMiddlewareManager())
      await obj.delete('foo')
      assert.deepStrictEqual(await adapter.listFiles(), [])
    })
  })

  describe('#deleteTemporary()', function () {
    it('deletes file and metadata', async function () {
      const adapter = new MemoryAdapter({
        'foo.tmp': Buffer.alloc(0),
        'foo.json': Buffer.from('{}')
      })
      const obj = new IOManager(adapter, mockMiddlewareManager())
      await obj.deleteTemporary('foo')
      assert.deepStrictEqual(await adapter.listFiles(), [])
    })

    it('ignores missing metadata file', async function () {
      const adapter = new MemoryAdapter({
        'foo.tmp': Buffer.alloc(0)
      })
      const obj = new IOManager(adapter, mockMiddlewareManager())
      await assert.doesNotReject(obj.deleteTemporary('foo'))
    })

    it('rejects for failure to delete metadata', async function () {
      const adapter = new MemoryAdapter()
      const _oldDelete = adapter.delete.bind(adapter)
      adapter.delete = async function (id) {
        if (id === 'foo.json') {
          throw Object.assign(new Error('no permission'), { code: 'EPERM' })
        }
        await _oldDelete(id)
      }
      const obj = new IOManager(adapter, mockMiddlewareManager())
      await assert.rejects(obj.deleteTemporary('foo'))
    })
  })

  describe('#readMetadata()', function () {
    it('parses the JSON file', async function () {
      const adapter = new MemoryAdapter({
        'foo.json': Buffer.from('{"foo": "bar"}')
      })
      const obj = new IOManager(adapter, mockMiddlewareManager())
      assert.deepStrictEqual(await obj.readMetadata('foo'), {
        foo: 'bar'
      })
    })

    it('rejects on syntax error', async function () {
      const adapter = new MemoryAdapter({
        'foo.json': Buffer.from('}foo')
      })
      const obj = new IOManager(adapter, mockMiddlewareManager())
      await assert.rejects(obj.readMetadata('foo'))
    })
  })

  describe('#writeMetadata()', function () {
    it('writes the JSON file', async function () {
      const adapter = new MemoryAdapter()
      const obj = new IOManager(adapter, mockMiddlewareManager())
      await obj.writeMetadata('foo', { foo: 'bar' })
      assert.strictEqual(await adapter.read('foo.json', 'utf8'), '{"foo":"bar"}')
    })
  })
})
