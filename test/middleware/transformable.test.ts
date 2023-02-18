import assert from 'assert'
import { PassThrough } from 'stream'
import { MiddlewareTransformable } from '../../src/middleware/transformable.js'

describe('lib/middleware/transformable.ts', function () {
  it('stores stream and metadata', function () {
    const stream = new PassThrough()
    const metadata = { a: 2 }
    const obj = new MiddlewareTransformable(stream, metadata)
    assert.strictEqual(obj.stream, stream)
    assert.strictEqual(obj.metadata, metadata)
  })

  it('has "metadataChanged" set to false', function () {
    const obj = new MiddlewareTransformable(new PassThrough(), {})
    assert.strictEqual(obj.metadataChanged, false)
  })

  describe('#update()', function () {
    it('does nothing for undefined/null input', function () {
      const stream = new PassThrough()
      const metadata = { a: 2 }
      const obj = new MiddlewareTransformable(stream, metadata)
      obj.update(undefined)
      obj.update(null as any)
      assert.strictEqual(obj.stream, stream)
      assert.strictEqual(obj.metadata, metadata)
      assert.strictEqual(obj.metadataChanged, false)
    })

    it('does nothing for empty object input', function () {
      const stream = new PassThrough()
      const metadata = { a: 2 }
      const obj = new MiddlewareTransformable(stream, metadata)
      obj.update({})
      assert.strictEqual(obj.stream, stream)
      assert.strictEqual(obj.metadata, metadata)
      assert.strictEqual(obj.metadataChanged, false)
    })

    it('updates stream if present', function () {
      const stream1 = new PassThrough()
      const stream2 = new PassThrough()
      const metadata = { a: 2 }
      const obj = new MiddlewareTransformable(stream1, metadata)
      obj.update({ stream: stream2 })
      assert.strictEqual(obj.stream, stream2)
      assert.strictEqual(obj.metadata, metadata)
      assert.strictEqual(obj.metadataChanged, false)
    })

    it('updates metadata and sets metadataChanged if present', function () {
      const stream = new PassThrough()
      const metadata1 = { a: 2 }
      const metadata2 = { a: 2 }
      const obj = new MiddlewareTransformable(stream, metadata1)
      obj.update({ metadata: metadata2 })
      assert.strictEqual(obj.stream, stream)
      assert.strictEqual(obj.metadata, metadata2)
      assert.strictEqual(obj.metadataChanged, true)
    })
  })
})
