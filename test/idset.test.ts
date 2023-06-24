import assert from 'assert'
import { setTimeout as delay } from 'node:timers/promises'
import { IdSet } from '../src/idset.js'

describe('lib/idset.ts', function () {
  describe('#add()', function () {
    it('returns a promise', async function () {
      const obj = new IdSet(() => ['AB', 'CD'])
      await assert.doesNotReject(obj.add('EF'))
    })
  })

  describe('#remove()', function () {
    it('returns a promise', async function () {
      const obj = new IdSet(() => ['AB', 'CD'])
      await assert.doesNotReject(obj.remove('AB'))
    })
  })

  describe('#includes()', function () {
    it('finds loaded ids', async function () {
      const obj = new IdSet(() => ['AB', 'CD'])
      assert.strictEqual(await obj.includes('AB'), true)
    })

    it('finds added ids', async function () {
      const obj = new IdSet(() => ['AB', 'CD'])
      await obj.add('EF')
      assert.strictEqual(await obj.includes('EF'), true)
    })

    it('gives false for missing ids', async function () {
      const obj = new IdSet(() => ['AB', 'CD'])
      assert.strictEqual(await obj.includes('EF'), false)
    })

    it('gives false for removed ids', async function () {
      const obj = new IdSet(() => ['AB', 'CD'])
      await obj.remove('AB')
      assert.strictEqual(await obj.includes('AB'), false)
    })
  })

  describe('#each()', function () {
    it('iterates over all items', function (done) {
      const obj = new IdSet(() => ['AB', 'CD', 'EF'])
      const parameters: string[] = []
      void obj.each((id) => {
        parameters.push(id)
        if (parameters.length >= 3) {
          assert.deepStrictEqual(parameters.sort(), ['AB', 'CD', 'EF'])
          done()
        }
      })
    })

    it('returns a Promise', async function () {
      const obj = new IdSet(() => ['AB', 'CD', 'EF'])
      await assert.doesNotReject(obj.each(() => {}))
    })

    it('fulfills the Promise after all iterations are done', async function () {
      const obj = new IdSet(() => ['AB', 'CD', 'EF'])
      let iterations = 0
      await obj.each(() => ++iterations)
      assert.strictEqual(iterations, 3)
    })

    it('awaits Promises returned by the callback', function (done) {
      const obj = new IdSet(() => ['AB', 'CD'])
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
      const obj = new IdSet(() => ['AB', 'CD', 'EF'])
      let removed: string | undefined
      await obj.each(async (id) => {
        if (removed == null) {
          // pick any item other than the current
          removed = id === 'AB' ? 'CD' : 'AB'
          return await obj.remove(removed)
        }
        assert.notStrictEqual(id, removed)
      })
    })
  })
})
