'use strict'

class IdSet {
  /**
   * Construct a new IdSet. The load function is used to obtain the initial list
   * of ids.
   *
   * @param {Function} loadFunction A function returning or promising an array of strings, the initial ids.
   */
  constructor (loadFunction) {
    this._backingSet = null

    // private method that promises the backing set on which to operate
    this._getBackingSet = async () => {
      if (!this._backingSet) {
        this._backingSet = new Set()
        const loaded = await loadFunction()
        for (const id of loaded) {
          this._backingSet.add(id)
        }
      }
      return this._backingSet
    }
  }

  /**
   * Add the given id to the set.
   *
   * @param {string} id The id to add.
   * @returns {Promise} A Promise that is resolved when done.
   */
  async add (id) {
    const set = await this._getBackingSet()
    set.add(id)
  }

  /**
   * Remove the given id from the set.
   *
   * @param {string} id The id to remove.
   * @returns {Promise} A Promise that is resolved when done.
   */
  async remove (id) {
    const set = await this._getBackingSet()
    set.delete(id)
  }

  /**
   * Determine whether the given id is contained in this set.
   *
   * @param {string} id The id to check.
   * @returns {Promise<boolean>} A Promise for whether the id is in this set.
   */
  async includes (id) {
    const set = await this._getBackingSet()
    return set.has(id)
  }

  /**
   * Iterate over all ids in this set. Iteration happens sequentially. If the
   * callback returns a Promise or thenable, it is awaited before continuing with
   * the next element.
   *
   * @param {Function} callbackFn The function to execute for each set element.
   * @returns {Promise} A Promise that is resolved when iteration is finished.
   */
  async each (callbackFn) {
    const set = await this._getBackingSet()
    const iter = set.values()
    /**
     * @returns {Promise<string>} The recursively next element to iterate.
     */
    async function next () {
      const { done, value } = iter.next()
      if (!done) {
        await callbackFn(value)
        await next()
      }
    }
    await next()
  }
}

module.exports = IdSet
