'use strict'

const chai = require('chai')
chai.use(require('chai-as-promised'))
const expect = chai.expect

const MiddlewareTransformable = require('../../lib/middleware/transformable.js')

describe('lib/middleware/transformable.js', function () {
  it('stores stream and metadata', function () {
    const stream = { a: 1 }
    const metadata = { a: 2 }
    const obj = new MiddlewareTransformable(stream, metadata)
    expect(obj.stream).to.equal(stream)
    expect(obj.metadata).to.equal(metadata)
  })

  it('has "metadataChanged" set to false', function () {
    const obj = new MiddlewareTransformable({}, {})
    expect(obj.metadataChanged).to.be.false
  })

  describe('#update()', function () {
    it('does nothing for undefined/null input', function () {
      const stream = { a: 1 }
      const metadata = { a: 2 }
      const obj = new MiddlewareTransformable(stream, metadata)
      obj.update(undefined)
      obj.update(null)
      expect(obj.stream).to.equal(stream)
      expect(obj.metadata).to.equal(metadata)
      expect(obj.metadataChanged).to.be.false
    })

    it('does nothing for empty object input', function () {
      const stream = { a: 1 }
      const metadata = { a: 2 }
      const obj = new MiddlewareTransformable(stream, metadata)
      obj.update({})
      expect(obj.stream).to.equal(stream)
      expect(obj.metadata).to.equal(metadata)
      expect(obj.metadataChanged).to.be.false
    })

    it('updates stream if present', function () {
      const stream1 = { a: 0 }
      const stream2 = { a: 1 }
      const metadata = { a: 2 }
      const obj = new MiddlewareTransformable(stream1, metadata)
      obj.update({ stream: stream2 })
      expect(obj.stream).to.equal(stream2)
      expect(obj.metadata).to.equal(metadata)
      expect(obj.metadataChanged).to.be.false
    })

    it('updates metadata and sets metadataChanged if present', function () {
      const stream = { a: 1 }
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
