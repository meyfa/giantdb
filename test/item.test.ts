import assert from 'node:assert'
import { PassThrough, Readable, Writable } from 'node:stream'
import { IOManager } from '../src/iomanager.js'
import { MemoryAdapter } from 'fs-adapters'
import { MiddlewareManager } from '../src/middleware/manager.js'
import { Item } from '../src/item.js'

/**
 * @returns Mock I/O manager.
 */
function mockIOManager (): IOManager {
  return new IOManager(new MemoryAdapter(), new MiddlewareManager())
}

describe('lib/item.ts', function () {
  it('has property "id"', function () {
    const obj = new Item('foo', mockIOManager(), {})
    assert.strictEqual(obj.id, 'foo')
  })

  it('has property "metadata"', function () {
    const metadata = { foo: 'bar', baz: 42 }
    const obj = new Item('foo', mockIOManager(), metadata)
    assert.strictEqual(obj.metadata, metadata)
  })

  describe('#getReadable()', function () {
    it('gets a stream from the IO manager', async function () {
      const expected = new Readable()
      const manager = mockIOManager()
      manager.createReadStream = async () => ({
        metadata: {},
        metadataChanged: false,
        stream: expected
      })
      const obj = new Item('foo', manager, {})
      assert.strictEqual(await obj.getReadable(), expected)
    })

    it('passes id, metadata and options to the IO manager', function (done) {
      const metadata = { meta: true }
      const expectedOptions = { options: true }
      const manager = mockIOManager()
      manager.createReadStream = async (id, meta, options) => {
        assert.strictEqual(id, 'foo')
        assert.strictEqual(meta, metadata)
        assert.strictEqual(options, expectedOptions)
        done()
        return {
          metadata: {},
          metadataChanged: false,
          stream: new PassThrough()
        }
      }
      const obj = new Item('foo', manager, metadata)
      void obj.getReadable(expectedOptions)
    })

    it('updates its metadata when changed', async function () {
      const expected = { meta: true, changed: true }
      const manager = mockIOManager()
      manager.createReadStream = async () => ({
        metadata: expected,
        metadataChanged: true,
        stream: new PassThrough()
      })
      const obj = new Item('foo', manager, {})
      await obj.getReadable()
      assert.strictEqual(obj.metadata, expected)
    })
  })

  describe('#getWritable()', function () {
    it('gets a stream from the IO manager', async function () {
      const expected = new Writable()
      const manager = mockIOManager()
      manager.createWriteStream = async () => ({
        metadata: {},
        metadataChanged: false,
        stream: expected
      })
      const obj = new Item('foo', manager, {})
      assert.strictEqual(await obj.getWritable(), expected)
    })

    it('passes id, metadata and options to the IO manager', function (done) {
      const metadata = { meta: true }
      const expectedOptions = { options: true }
      const manager = mockIOManager()
      manager.createWriteStream = async (id, meta, options) => {
        assert.strictEqual(id, 'foo')
        assert.strictEqual(meta, metadata)
        assert.strictEqual(options, expectedOptions)
        done()
        return {
          metadata: {},
          metadataChanged: false,
          stream: new PassThrough()
        }
      }
      const obj = new Item('foo', manager, metadata)
      void obj.getWritable(expectedOptions)
    })

    it('updates its metadata when changed', async function () {
      const expected = { meta: true, changed: true }
      const manager = mockIOManager()
      manager.createWriteStream = async () => ({
        metadata: expected,
        metadataChanged: true,
        stream: new PassThrough()
      })
      const obj = new Item('foo', manager, {})
      await obj.getWritable()
      assert.strictEqual(obj.metadata, expected)
    })
  })

  describe('#saveMetadata()', function () {
    it('calls the I/O manager\'s "writeMetadata" method', function (done) {
      const expected = {
        foo: 'bar',
        baz: 42
      }
      const manager = mockIOManager()
      manager.writeMetadata = async (id, data) => {
        assert.strictEqual(id, 'foo')
        assert.strictEqual(data, expected)
        done()
      }
      const obj = new Item('foo', manager, expected)
      void obj.saveMetadata()
    })

    it('returns a Promise', async function () {
      const obj = new Item('foo', mockIOManager(), {})
      await assert.doesNotReject(obj.saveMetadata())
    })
  })
})
