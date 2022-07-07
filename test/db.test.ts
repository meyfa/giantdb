import delay from 'delay'
import { MemoryAdapter } from 'fs-adapters'
import { Change } from '../lib/change.js'
import { Item } from '../lib/item.js'
import { GiantDB } from '../lib/giantdb.js'

import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
chai.use(chaiAsPromised)

describe('lib/db.ts', function () {
  describe('#use()', function () {
    it('registers middleware', function () {
      const obj = new GiantDB()
      obj.use({})
    })
  })

  describe('#create()', function () {
    it('returns a promise', function () {
      const obj = new GiantDB()
      return expect(obj.create()).to.eventually.be.fulfilled
    })

    it('resolves to a Change', function () {
      const obj = new GiantDB()
      return expect(obj.create()).to.eventually.be.instanceOf(Change)
    })

    it('sets an id', function () {
      const obj = new GiantDB()
      return expect(obj.create()).to.eventually.have.property('id')
        .that.is.a('string')
    })

    it('does not make the item accessible immediately', async function () {
      const obj = new GiantDB()
      return await obj.create().then((change) => {
        return expect(obj.get(change.id)).to.eventually.be.rejected
      })
    })

    describe('.commit()', function () {
      it('makes the item accessible', async function () {
        const obj = new GiantDB()
        return await obj.create().then(async (change) => {
          return await change.commit().then(() => {
            return expect(obj.get(change.id)).to.eventually.be.fulfilled
          })
        })
      })

      it('resolves to an Item', async function () {
        const obj = new GiantDB()
        return await obj.create().then(async (change) => {
          return await change.commit().then((item) => {
            return expect(item).to.be.instanceOf(Item)
              .with.property('id').that.equals(change.id)
          })
        })
      })
    })
  })

  describe('#remove()', function () {
    it('rejects for nonexistent ids', function () {
      const obj = new GiantDB()
      return expect(obj.remove('foo')).to.eventually.be.rejected
    })

    it('makes items inaccessible', async function () {
      const obj = new GiantDB()
      return await obj.create().then(async (change) => {
        return await change.commit()
      }).then(async (item) => {
        return await obj.remove(item.id).then(() => {
          return expect(obj.get(item.id)).to.eventually.be.rejected
        })
      })
    })

    it('removes items from source', async function () {
      const source = new MemoryAdapter({
        foo: Buffer.alloc(0),
        'foo.json': Buffer.from('{}')
      })
      const obj = new GiantDB(source)
      return await obj.remove('foo').then(() => {
        return expect(source.listFiles()).to.eventually.not.include('foo')
      })
    })
  })

  describe('#get()', function () {
    it('rejects for nonexistent ids', function () {
      const obj = new GiantDB()
      return expect(obj.get('missing')).to.eventually.be.rejected
    })

    it('resolves to an Item', async function () {
      const obj = new GiantDB()
      return await obj.create().then(async (change) => {
        return await change.commit().then(() => {
          return expect(obj.get(change.id)).to.eventually.be.instanceOf(Item)
        })
      })
    })

    it('sets the id', async function () {
      const obj = new GiantDB()
      return await obj.create().then(async (change) => {
        return await change.commit().then(() => {
          return expect(obj.get(change.id))
            .to.eventually.have.property('id').that.equals(change.id)
        })
      })
    })

    it('loads items from source', function () {
      const obj = new GiantDB(new MemoryAdapter({
        foo: Buffer.alloc(0),
        'foo.json': Buffer.from('{}')
      }))
      return expect(obj.get('foo')).to.eventually.be.instanceOf(Item)
    })

    it('does not load .tmp files', function () {
      const obj = new GiantDB(new MemoryAdapter({
        'foo.tmp': Buffer.alloc(0),
        'foo.json': Buffer.from('{}'),
        'foo.tmp.json': Buffer.from('{}')
      }))
      return expect(obj.get('foo.tmp')).to.eventually.be.rejected
    })

    it('does not load .json files', function () {
      const obj = new GiantDB(new MemoryAdapter({
        foo: Buffer.alloc(0),
        'foo.json': Buffer.from('{}'),
        'foo.json.json': Buffer.from('{}')
      }))
      return expect(obj.get('foo.json')).to.eventually.be.rejected
    })

    it('loads metadata', async function () {
      const obj = new GiantDB(new MemoryAdapter({
        foo: Buffer.alloc(0),
        'foo.json': Buffer.from('{"foo": "bar", "baz": 42}')
      }))
      return await obj.get('foo').then((item) => {
        return expect(item.metadata).to.deep.equal({
          foo: 'bar',
          baz: 42
        })
      })
    })
  })

  describe('#each()', function () {
    it('iterates over all items', function (done) {
      const obj = new GiantDB(new MemoryAdapter({
        foo: Buffer.alloc(0),
        'foo.json': Buffer.from('{}'),
        bar: Buffer.alloc(0),
        'bar.json': Buffer.from('{}')
      }))
      const ids: string[] = []
      void obj.each((item) => {
        ids.push(item.id)
        if (ids.length >= 2) {
          expect(ids).to.have.members(['foo', 'bar'])
          done()
        }
      })
    })

    it('returns a Promise', function () {
      const obj = new GiantDB(new MemoryAdapter({
        foo: Buffer.alloc(0),
        'foo.json': Buffer.from('{}')
      }))
      return expect(obj.each(() => {})).to.eventually.be.fulfilled
    })

    it('fulfills the Promise after all iterations are done', async function () {
      const obj = new GiantDB(new MemoryAdapter({
        foo: Buffer.alloc(0),
        'foo.json': Buffer.from('{}'),
        bar: Buffer.alloc(0),
        'bar.json': Buffer.from('{}')
      }))
      let iterations = 0
      return await obj.each(() => ++iterations).then(() => {
        return expect(iterations).to.equal(2)
      })
    })

    it('awaits Promises returned by the callback', function (done) {
      const obj = new GiantDB(new MemoryAdapter({
        foo: Buffer.alloc(0),
        'foo.json': Buffer.from('{}'),
        bar: Buffer.alloc(0),
        'bar.json': Buffer.from('{}')
      }))
      let first = true
      let finished = false
      void obj.each(async () => {
        if (first) {
          first = false
          await delay(20)
          finished = true
        } else {
          expect(finished).to.be.true
          done()
        }
      })
    })

    it('allows for element removal', async function () {
      const obj = new GiantDB(new MemoryAdapter({
        foo: Buffer.alloc(0),
        'foo.json': Buffer.from('{}'),
        bar: Buffer.alloc(0),
        'bar.json': Buffer.from('{}'),
        qux: Buffer.alloc(0),
        'qux.json': Buffer.from('{}')
      }))
      let removed: string | undefined
      await obj.each((item) => {
        if (removed == null) {
          // pick any item other than the current
          removed = item.id === 'foo' ? 'bar' : 'foo'
          return obj.remove(removed)
        }
        expect(item.id).to.not.equal(removed)
      })
    })
  })
})
