import { PassThrough, Writable } from 'stream'
import { Change } from '../lib/change'
import { Item } from '../lib/item'

import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
chai.use(chaiAsPromised)

/**
 * @returns A mock committer function.
 */
function mockCommitter (): () => Promise<Item> {
  return () => Promise.resolve({}) as any
}

describe('lib/change.ts', function () {
  it("has property 'id'", function () {
    const out = new Writable()
    const obj = new Change('foo', out, mockCommitter(), () => {})
    return expect(obj.id).to.equal('foo')
  })

  describe('#write()', function () {
    it('destroys on write error', function (done) {
      const out = new Writable({
        write: (ch: Buffer, enc: BufferEncoding, cb: (err?: any) => any) => cb(new Error('oops!'))
      })
      const obj = new Change('foo', out, mockCommitter(), () => done())
      obj.write('data')
    })
  })

  describe('#end()', function () {
    it('does not destroy', function (done) {
      const out = new Writable()
      const obj = new Change('foo', out, mockCommitter(), () => expect.fail())
      obj.on('finish', function () {
        expect(obj.destroyed).to.be.false
        done()
      })
      obj.end()
    })
  })

  describe('#commit()', function () {
    it('ends itself', function (done) {
      const out = new Writable()
      const obj = new Change('foo', out, mockCommitter(), () => {})
      obj.on('finish', done)
      void obj.commit()
    })

    it('returns a promise', function () {
      const out = new Writable()
      const obj = new Change('foo', out, mockCommitter(), () => {})
      return expect(obj.commit()).to.eventually.be.fulfilled
    })

    it('invokes the committer', function (done) {
      const out = new Writable()
      const obj = new Change('foo', out, (() => {
        done()
        return {}
      }) as any, () => {})
      void obj.commit()
    })

    it("resolves to the committer's return value", function () {
      const out = new Writable()
      const obj = new Change('foo', out, () => 42 as any, () => {})
      return expect(obj.commit()).to.eventually.equal(42)
    })

    it('rejects when called twice', function () {
      const out = new Writable()
      const obj = new Change('foo', out, mockCommitter(), () => {})
      void obj.commit()
      return expect(obj.commit()).to.eventually.be.rejectedWith('invalid state')
    })

    it('rejects when already destroyed', function (done) {
      const out = new Writable({
        write: (ch: Buffer, enc: BufferEncoding, cb: (err?: any) => any) => cb(new Error('oops!'))
      })
      const obj = new Change('foo', out, mockCommitter(), () => {})
      obj.on('error', function () {
        void expect(obj.commit()).to.eventually.be.rejectedWith('invalid state')
          .notify(done)
      })
      obj.end('some data to trigger write error')
    })

    it('rejects when the underlying stream fails', function () {
      const out = new PassThrough()
      out.end = () => {
        out.emit('error', new Error('oops!'))
        return out
      }
      const obj = new Change('foo', out, mockCommitter(), () => {})
      return expect(obj.commit()).to.eventually.be.rejectedWith('oops!')
    })

    it('invokes the destroyer when the underlying stream fails', function (done) {
      const out = new PassThrough()
      out.end = () => {
        out.emit('error', new Error('oops!'))
        return out
      }
      const obj = new Change('foo', out, mockCommitter(), () => done())
      obj.commit().catch(() => {})
    })

    it('resolves even if end() has already been called', function (done) {
      const out = new Writable()
      const obj = new Change('foo', out, mockCommitter(), () => {})
      obj.on('finish', function () {
        void expect(obj.commit()).to.eventually.be.fulfilled.notify(done)
      })
      obj.end()
    })
  })
})
