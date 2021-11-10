import { PassThrough } from 'stream'
import { MiddlewareTransformable } from '../../lib/middleware/transformable'

import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
chai.use(chaiAsPromised)

describe('lib/middleware/transformable.ts', function () {
  it('stores stream and metadata', function () {
    const stream = new PassThrough()
    const metadata = { a: 2 }
    const obj = new MiddlewareTransformable(stream, metadata)
    expect(obj.stream).to.equal(stream)
    expect(obj.metadata).to.equal(metadata)
  })

  it('has "metadataChanged" set to false', function () {
    const obj = new MiddlewareTransformable(new PassThrough(), {})
    expect(obj.metadataChanged).to.be.false
  })

  describe('#update()', function () {
    it('does nothing for undefined/null input', function () {
      const stream = new PassThrough()
      const metadata = { a: 2 }
      const obj = new MiddlewareTransformable(stream, metadata)
      obj.update(undefined)
      obj.update(null as any)
      expect(obj.stream).to.equal(stream)
      expect(obj.metadata).to.equal(metadata)
      expect(obj.metadataChanged).to.be.false
    })

    it('does nothing for empty object input', function () {
      const stream = new PassThrough()
      const metadata = { a: 2 }
      const obj = new MiddlewareTransformable(stream, metadata)
      obj.update({})
      expect(obj.stream).to.equal(stream)
      expect(obj.metadata).to.equal(metadata)
      expect(obj.metadataChanged).to.be.false
    })

    it('updates stream if present', function () {
      const stream1 = new PassThrough()
      const stream2 = new PassThrough()
      const metadata = { a: 2 }
      const obj = new MiddlewareTransformable(stream1, metadata)
      obj.update({ stream: stream2 })
      expect(obj.stream).to.equal(stream2)
      expect(obj.metadata).to.equal(metadata)
      expect(obj.metadataChanged).to.be.false
    })

    it('updates metadata and sets metadataChanged if present', function () {
      const stream = new PassThrough()
      const metadata1 = { a: 2 }
      const metadata2 = { a: 2 }
      const obj = new MiddlewareTransformable(stream, metadata1)
      obj.update({ metadata: metadata2 })
      expect(obj.stream).to.equal(stream)
      expect(obj.metadata).to.equal(metadata2)
      expect(obj.metadataChanged).to.be.true
    })
  })
})
