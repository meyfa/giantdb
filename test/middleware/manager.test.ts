import assert from 'node:assert'
import { PassThrough } from 'node:stream'
import { MiddlewareManager } from '../../src/middleware/manager.js'

describe('lib/middleware/manager.ts', function () {
  describe('#register()', function () {
    it('registers objects', function () {
      const obj = new MiddlewareManager()
      obj.register({})
    })
  })

  describe('#transformReadable()', function () {
    it('calls the middleware\'s method', function (done) {
      const obj = new MiddlewareManager()
      obj.register({
        transformReadable (stream, meta, options, next) {
          next()
          done()
        }
      })
      void obj.transformReadable(new PassThrough(), {}, {})
    })

    it('passes the arguments to the middleware', function (done) {
      const stream = new PassThrough()
      const meta = { meta: true }
      const options = { options: true }

      const obj = new MiddlewareManager()
      obj.register({
        transformReadable (str, met, opt, next) {
          assert.strictEqual(str, stream)
          assert.strictEqual(met, meta)
          assert.strictEqual(opt, options)
          next()
          done()
        }
      })
      void obj.transformReadable(stream, meta, options)
    })

    it('ignores middleware missing the method', async function () {
      const obj = new MiddlewareManager()
      obj.register({})
      obj.register({ transformReadable: null as any })
      await assert.doesNotReject(obj.transformReadable(new PassThrough(), {}, {}))
    })

    it('resolves to a result object', async function () {
      const stream = new PassThrough()
      const meta = { meta: true }
      const options = { options: true }

      const obj = new MiddlewareManager()
      const result = await obj.transformReadable(stream, meta, options)
      assert.strictEqual(result.stream, stream)
      assert.strictEqual(result.metadata, meta)
      assert.strictEqual(result.metadataChanged, false)
    })

    it('updates "stream" and "metadata"', async function () {
      const stream1 = new PassThrough()
      const stream2 = new PassThrough()
      const meta1 = { meta: true }
      const meta2 = { meta: 2, ordinal: 2 }
      const options = { options: true }

      const obj = new MiddlewareManager()
      obj.register({
        transformReadable (str, met, opt, next) {
          assert.strictEqual(str, stream1)
          assert.strictEqual(met, meta1)
          next(null, { metadata: meta2, stream: stream2 })
        }
      })
      obj.register({
        transformReadable (str, met, opt, next) {
          assert.strictEqual(str, stream2)
          assert.strictEqual(met, meta2)
          next()
        }
      })

      const result = await obj.transformReadable(stream1, meta1, options)
      assert.strictEqual(result.stream, stream2)
      assert.strictEqual(result.metadata, meta2)
      assert.strictEqual(result.metadataChanged, true)
    })

    it('sets metadataChanged when it was modified', async function () {
      const stream = new PassThrough()
      const meta = { meta: true }
      const options = { options: true }

      const obj = new MiddlewareManager()
      obj.register({
        transformReadable (str, met, opt, next) {
          next(null, { metadata: met })
        }
      })

      const result = await obj.transformReadable(stream, meta, options)
      assert.strictEqual(result.metadataChanged, true)
    })

    it('rejects when the middleware throws', async function () {
      const obj = new MiddlewareManager()
      obj.register({
        transformReadable () {
          throw new Error('oops!')
        }
      })
      await assert.rejects(obj.transformReadable(new PassThrough(), {}, {}))
    })

    it('rejects when the middleware passes an error', async function () {
      const obj = new MiddlewareManager()
      obj.register({
        transformReadable (str, met, opt, next) {
          next(new Error('oops!'))
        }
      })
      await assert.rejects(obj.transformReadable(new PassThrough(), {}, {}))
    })
  })

  describe('#transformWritable()', function () {
    it('calls the middleware\'s method', function (done) {
      const obj = new MiddlewareManager()
      obj.register({
        transformWritable (stream, meta, options, next) {
          next()
          done()
        }
      })
      void obj.transformWritable(new PassThrough(), {}, {})
    })

    it('passes the arguments to the middleware', function (done) {
      const stream = new PassThrough()
      const meta = { meta: true }
      const options = { options: true }

      const obj = new MiddlewareManager()
      obj.register({
        transformWritable (str, met, opt, next) {
          assert.strictEqual(str, stream)
          assert.strictEqual(met, meta)
          assert.strictEqual(opt, options)
          next()
          done()
        }
      })
      void obj.transformWritable(stream, meta, options)
    })

    it('ignores middleware missing the method', async function () {
      const obj = new MiddlewareManager()
      obj.register({})
      obj.register({ transformWritable: null as any })
      await assert.doesNotReject(obj.transformWritable(new PassThrough(), {}, {}))
    })

    it('resolves to a result object', async function () {
      const stream = new PassThrough()
      const meta = { meta: true }
      const options = { options: true }

      const obj = new MiddlewareManager()
      const result = await obj.transformWritable(stream, meta, options)
      assert.strictEqual(result.stream, stream)
      assert.strictEqual(result.metadata, meta)
      assert.strictEqual(result.metadataChanged, false)
    })

    it('updates "stream" and "metadata"', async function () {
      const stream1 = new PassThrough()
      const stream2 = new PassThrough()
      const meta1 = { meta: true }
      const meta2 = { meta: 2, ordinal: 2 }
      const options = { options: true }

      const obj = new MiddlewareManager()
      obj.register({
        transformWritable (str, met, opt, next) {
          assert.strictEqual(str, stream1)
          assert.strictEqual(met, meta1)
          next(null, { metadata: meta2, stream: stream2 })
        }
      })
      obj.register({
        transformWritable (str, met, opt, next) {
          assert.strictEqual(str, stream2)
          assert.strictEqual(met, meta2)
          next()
        }
      })

      const result = await obj.transformWritable(stream1, meta1, options)
      assert.strictEqual(result.stream, stream2)
      assert.strictEqual(result.metadata, meta2)
      assert.strictEqual(result.metadataChanged, true)
    })

    it('sets metadataChanged when it was modified', async function () {
      const stream = new PassThrough()
      const meta = { meta: true }
      const options = { options: true }

      const obj = new MiddlewareManager()
      obj.register({
        transformWritable (str, met, opt, next) {
          next(null, { metadata: met })
        }
      })

      const result = await obj.transformWritable(stream, meta, options)
      assert.strictEqual(result.metadataChanged, true)
    })

    it('rejects when the middleware throws', async function () {
      const obj = new MiddlewareManager()
      obj.register({
        transformWritable () {
          throw new Error('oops!')
        }
      })
      await assert.rejects(obj.transformWritable(new PassThrough(), {}, {}))
    })

    it('rejects when the middleware passes an error', async function () {
      const obj = new MiddlewareManager()
      obj.register({
        transformWritable (str, met, opt, next) {
          next(new Error('oops!'))
        }
      })
      await assert.rejects(obj.transformWritable(new PassThrough(), {}, {}))
    })
  })
})
