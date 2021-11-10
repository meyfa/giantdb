import { PassThrough, Readable, Writable } from 'stream'
import { IOManager } from '../lib/iomanager'
import { MemoryAdapter } from 'fs-adapters'
import { MiddlewareManager } from '../lib/middleware/manager'
import { Item } from '../lib/item'

import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
chai.use(chaiAsPromised)

/**
 * @returns Mock I/O manager.
 */
function mockIOManager (): IOManager {
  return new IOManager(new MemoryAdapter(), new MiddlewareManager())
}

describe('lib/item.ts', function () {
  it("has property 'id'", function () {
    const obj = new Item('foo', mockIOManager(), {})
    return expect(obj.id).to.equal('foo')
  })

  it("has property 'metadata'", function () {
    const metadata = { foo: 'bar', baz: 42 }
    const obj = new Item('foo', mockIOManager(), metadata)
    return expect(obj.metadata).to.equal(metadata)
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
      await expect(obj.getReadable()).to.eventually.equal(expected)
    })

    it('passes id, metadata and options to the IO manager', function (done) {
      const metadata = { meta: true }
      const expectedOptions = { options: true }
      const manager = mockIOManager()
      manager.createReadStream = async (id, meta, options) => {
        expect(id).to.equal('foo')
        expect(meta).to.equal(metadata)
        expect(options).to.equal(expectedOptions)
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
      return await obj.getReadable().then(() => {
        return expect(obj.metadata).to.equal(expected)
      })
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
      await expect(obj.getWritable()).to.eventually.equal(expected)
    })

    it('passes id, metadata and options to the IO manager', function (done) {
      const metadata = { meta: true }
      const expectedOptions = { options: true }
      const manager = mockIOManager()
      manager.createWriteStream = async (id, meta, options) => {
        expect(id).to.equal('foo')
        expect(meta).to.equal(metadata)
        expect(options).to.equal(expectedOptions)
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
      return await obj.getWritable().then(() => {
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
      const manager = mockIOManager()
      manager.writeMetadata = async (id, data) => {
        expect(id).to.equal('foo')
        expect(data).to.equal(expected)
        done()
      }
      const obj = new Item('foo', manager, expected)
      void obj.saveMetadata()
    })

    it('returns a Promise', async function () {
      const obj = new Item('foo', mockIOManager(), {})
      await expect(obj.saveMetadata()).to.eventually.be.fulfilled
    })
  })
})
