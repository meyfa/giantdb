import assert from 'node:assert'
import { PassThrough, Writable } from 'node:stream'
import { Change } from '../src/change.js'
import { Item } from '../src/item.js'

/**
 * @returns A mock committer function.
 */
function mockCommitter (): () => Promise<Item> {
  return () => Promise.resolve({}) as any
}

describe('lib/change.ts', function () {
  it('has property "id"', function () {
    const out = new Writable()
    const obj = new Change('foo', out, mockCommitter(), () => {})
    assert.strictEqual(obj.id, 'foo')
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
      const obj = new Change('foo', out, mockCommitter(), () => assert.fail())
      obj.on('finish', function () {
        assert.strictEqual(obj.destroyed, false)
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

    it('returns a promise', async function () {
      const out = new Writable()
      const obj = new Change('foo', out, mockCommitter(), () => {})
      await assert.doesNotReject(obj.commit())
    })

    it('invokes the committer', function (done) {
      const out = new Writable()
      const obj = new Change('foo', out, (() => {
        done()
        return {}
      }) as any, () => {})
      void obj.commit()
    })

    it('resolves to the committer\'s return value', async function () {
      const out = new Writable()
      const obj = new Change('foo', out, () => 42 as any, () => {})
      assert.strictEqual(await obj.commit(), 42)
    })

    it('rejects when called twice', async function () {
      const out = new Writable()
      const obj = new Change('foo', out, mockCommitter(), () => {})
      void obj.commit()
      await assert.rejects(obj.commit(), { message: 'invalid state' })
    })

    it('rejects when already destroyed', function (done) {
      const out = new Writable({
        write: (ch: Buffer, enc: BufferEncoding, cb: (err?: any) => any) => cb(new Error('oops!'))
      })
      const obj = new Change('foo', out, mockCommitter(), () => {})
      obj.on('error', function () {
        assert.rejects(obj.commit(), { message: 'invalid state' }).then(done, (err: unknown) => done(err))
      })
      obj.end('some data to trigger write error')
    })

    it('rejects when the underlying stream fails', async function () {
      const out = new PassThrough()
      out.end = () => {
        out.emit('error', new Error('oops!'))
        return out
      }
      const obj = new Change('foo', out, mockCommitter(), () => {})
      await assert.rejects(obj.commit(), { message: 'oops!' })
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
        assert.doesNotReject(obj.commit()).then(done, (err: unknown) => done(err))
      })
      obj.end()
    })
  })
})
