import { PassThrough } from 'stream'
import { MiddlewareManager } from '../../lib/middleware/manager'

import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
chai.use(chaiAsPromised)

describe('lib/middleware/manager.ts', function () {
  describe('#register()', function () {
    it('registers objects', function () {
      const obj = new MiddlewareManager()
      obj.register({})
    })
  })

  describe('#transformReadable()', function () {
    it("calls the middleware's method", function (done) {
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
          expect(str).to.equal(stream)
          expect(met).to.equal(meta)
          expect(opt).to.equal(options)
          next()
          done()
        }
      })
      void obj.transformReadable(stream, meta, options)
    })

    it('ignores middleware missing the method', function () {
      const obj = new MiddlewareManager()
      obj.register({})
      obj.register({ transformReadable: null as any })
      return expect(obj.transformReadable(new PassThrough(), {}, {}))
        .to.eventually.be.fulfilled
    })

    it('resolves to a result object', function () {
      const stream = new PassThrough()
      const meta = { meta: true }
      const options = { options: true }

      const obj = new MiddlewareManager()
      return expect(obj.transformReadable(stream, meta, options))
        .to.eventually.be.an('object').that.deep.equals({
          stream: stream,
          metadata: meta,
          metadataChanged: false
        })
    })

    it("updates 'stream' and 'metadata'", function () {
      const stream1 = new PassThrough()
      const stream2 = new PassThrough()
      const meta1 = { meta: true }
      const meta2 = { meta: 2, ordinal: 2 }
      const options = { options: true }

      const obj = new MiddlewareManager()
      obj.register({
        transformReadable (str, met, opt, next) {
          expect(str).to.equal(stream1)
          expect(met).to.equal(meta1)
          next(null, { metadata: meta2, stream: stream2 })
        }
      })
      obj.register({
        transformReadable (str, met, opt, next) {
          expect(str).to.equal(stream2)
          expect(met).to.equal(meta2)
          next()
        }
      })

      return expect(obj.transformReadable(stream1, meta1, options))
        .to.eventually.deep.equal({
          metadataChanged: true,
          stream: stream2,
          metadata: meta2
        })
    })

    it('sets metadataChanged when it was modified', function () {
      const stream = new PassThrough()
      const meta = { meta: true }
      const options = { options: true }

      const obj = new MiddlewareManager()
      obj.register({
        transformReadable (str, met, opt, next) {
          next(null, { metadata: met })
        }
      })

      return expect(obj.transformReadable(stream, meta, options))
        .to.eventually.have.property('metadataChanged').that.is.true
    })

    it('rejects when the middleware throws', function () {
      const obj = new MiddlewareManager()
      obj.register({
        transformReadable () {
          throw new Error('oops!')
        }
      })
      return expect(obj.transformReadable(new PassThrough(), {}, {}))
        .to.eventually.be.rejected
    })

    it('rejects when the middleware passes an error', function () {
      const obj = new MiddlewareManager()
      obj.register({
        transformReadable (str, met, opt, next) {
          next(new Error('oops!'))
        }
      })
      return expect(obj.transformReadable(new PassThrough(), {}, {}))
        .to.eventually.be.rejected
    })
  })

  describe('#transformWritable()', function () {
    it("calls the middleware's method", function (done) {
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
          expect(str).to.equal(stream)
          expect(met).to.equal(meta)
          expect(opt).to.equal(options)
          next()
          done()
        }
      })
      void obj.transformWritable(stream, meta, options)
    })

    it('ignores middleware missing the method', function () {
      const obj = new MiddlewareManager()
      obj.register({})
      obj.register({ transformWritable: null as any })
      return expect(obj.transformWritable(new PassThrough(), {}, {}))
        .to.eventually.be.fulfilled
    })

    it('resolves to a result object', function () {
      const stream = new PassThrough()
      const meta = { meta: true }
      const options = { options: true }

      const obj = new MiddlewareManager()
      return expect(obj.transformWritable(stream, meta, options))
        .to.eventually.be.an('object').that.deep.equals({
          stream: stream,
          metadata: meta,
          metadataChanged: false
        })
    })

    it("updates 'stream' and 'metadata'", function () {
      const stream1 = new PassThrough()
      const stream2 = new PassThrough()
      const meta1 = { meta: true }
      const meta2 = { meta: 2, ordinal: 2 }
      const options = { options: true }

      const obj = new MiddlewareManager()
      obj.register({
        transformWritable (str, met, opt, next) {
          expect(str).to.equal(stream1)
          expect(met).to.equal(meta1)
          next(null, { metadata: meta2, stream: stream2 })
        }
      })
      obj.register({
        transformWritable (str, met, opt, next) {
          expect(str).to.equal(stream2)
          expect(met).to.equal(meta2)
          next()
        }
      })

      return expect(obj.transformWritable(stream1, meta1, options))
        .to.eventually.deep.equal({
          metadataChanged: true,
          stream: stream2,
          metadata: meta2
        })
    })

    it('sets metadataChanged when it was modified', function () {
      const stream = new PassThrough()
      const meta = { meta: true }
      const options = { options: true }

      const obj = new MiddlewareManager()
      obj.register({
        transformWritable (str, met, opt, next) {
          next(null, { metadata: met })
        }
      })

      return expect(obj.transformWritable(stream, meta, options))
        .to.eventually.have.property('metadataChanged').that.is.true
    })

    it('rejects when the middleware throws', function () {
      const obj = new MiddlewareManager()
      obj.register({
        transformWritable () {
          throw new Error('oops!')
        }
      })
      return expect(obj.transformWritable(new PassThrough(), {}, {}))
        .to.eventually.be.rejected
    })

    it('rejects when the middleware passes an error', function () {
      const obj = new MiddlewareManager()
      obj.register({
        transformWritable (str, met, opt, next) {
          next(new Error('oops!'))
        }
      })
      return expect(obj.transformWritable(new PassThrough(), {}, {}))
        .to.eventually.be.rejected
    })
  })
})
