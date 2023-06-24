import assert from 'assert'
import delay from 'delay'
import { MemoryAdapter } from 'fs-adapters'
import { Change } from '../src/change.js'
import { Item } from '../src/item.js'
import { GiantDB } from '../src/giantdb.js'

describe('lib/db.ts', function () {
  describe('#use()', function () {
    it('registers middleware', function () {
      const obj = new GiantDB()
      obj.use({})
    })
  })

  describe('#create()', function () {
    it('returns a promise', async function () {
      const obj = new GiantDB()
      await assert.doesNotReject(obj.create())
    })

    it('resolves to a Change', async function () {
      const obj = new GiantDB()
      assert.ok(await obj.create() instanceof Change)
    })

    it('sets an id', async function () {
      const obj = new GiantDB()
      const change = await obj.create()
      assert.strictEqual(typeof change.id, 'string')
    })

    it('does not make the item accessible immediately', async function () {
      const obj = new GiantDB()
      const change = await obj.create()
      await assert.rejects(obj.get(change.id))
    })

    describe('.commit()', function () {
      it('makes the item accessible', async function () {
        const obj = new GiantDB()
        const change = await obj.create()
        await change.commit()
        await assert.doesNotReject(obj.get(change.id))
      })

      it('resolves to an Item', async function () {
        const obj = new GiantDB()
        const change = await obj.create()
        const item = await change.commit()
        assert.ok(item instanceof Item)
        assert.strictEqual(item.id, change.id)
      })
    })
  })

  describe('#remove()', function () {
    it('rejects for nonexistent ids', async function () {
      const obj = new GiantDB()
      await assert.rejects(obj.remove('foo'))
    })

    it('makes items inaccessible', async function () {
      const obj = new GiantDB()
      const change = await obj.create()
      const item = await change.commit()
      await obj.remove(item.id)
      await assert.rejects(obj.get(item.id))
    })

    it('removes items from source', async function () {
      const source = new MemoryAdapter({
        foo: Buffer.alloc(0),
        'foo.json': Buffer.from('{}')
      })
      const obj = new GiantDB(source)
      await obj.remove('foo')
      assert.deepStrictEqual(await source.listFiles(), [])
    })
  })

  describe('#get()', function () {
    it('rejects for nonexistent ids', async function () {
      const obj = new GiantDB()
      await assert.rejects(obj.get('missing'))
    })

    it('resolves to an Item', async function () {
      const obj = new GiantDB()
      const change = await obj.create()
      await change.commit()
      assert.ok(await obj.get(change.id) instanceof Item)
    })

    it('sets the id', async function () {
      const obj = new GiantDB()
      const change = await obj.create()
      await change.commit()
      const item = await obj.get(change.id)
      assert.strictEqual(item.id, change.id)
    })

    it('loads items from source', async function () {
      const obj = new GiantDB(new MemoryAdapter({
        foo: Buffer.alloc(0),
        'foo.json': Buffer.from('{}')
      }))
      assert.ok(await obj.get('foo') instanceof Item)
    })

    it('does not load .tmp files', async function () {
      const obj = new GiantDB(new MemoryAdapter({
        'foo.tmp': Buffer.alloc(0),
        'foo.json': Buffer.from('{}'),
        'foo.tmp.json': Buffer.from('{}')
      }))
      await assert.rejects(obj.get('foo.tmp'))
    })

    it('does not load .json files', async function () {
      const obj = new GiantDB(new MemoryAdapter({
        foo: Buffer.alloc(0),
        'foo.json': Buffer.from('{}'),
        'foo.json.json': Buffer.from('{}')
      }))
      await assert.rejects(obj.get('foo.json'))
    })

    it('loads metadata', async function () {
      const obj = new GiantDB(new MemoryAdapter({
        foo: Buffer.alloc(0),
        'foo.json': Buffer.from('{"foo": "bar", "baz": 42}')
      }))
      const item = await obj.get('foo')
      assert.deepStrictEqual(item.metadata, { foo: 'bar', baz: 42 })
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
          assert.deepStrictEqual(ids.sort(), ['bar', 'foo'])
          done()
        }
      })
    })

    it('returns a Promise', async function () {
      const obj = new GiantDB(new MemoryAdapter({
        foo: Buffer.alloc(0),
        'foo.json': Buffer.from('{}')
      }))
      await assert.doesNotReject(obj.each(() => {}))
    })

    it('fulfills the Promise after all iterations are done', async function () {
      const obj = new GiantDB(new MemoryAdapter({
        foo: Buffer.alloc(0),
        'foo.json': Buffer.from('{}'),
        bar: Buffer.alloc(0),
        'bar.json': Buffer.from('{}')
      }))
      let iterations = 0
      await obj.each(() => ++iterations)
      assert.strictEqual(iterations, 2)
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
          assert.ok(finished)
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
      await obj.each(async (item) => {
        if (removed == null) {
          // pick any item other than the current
          removed = item.id === 'foo' ? 'bar' : 'foo'
          return await obj.remove(removed)
        }
        assert.notStrictEqual(item.id, removed)
      })
    })
  })
})
