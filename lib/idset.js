'use strict'

const Promise = require('bluebird')

class IdSet {
  /**
   * Construct a new IdSet. The load function is used to obtain the initial list
   * of ids.
   *
   * @param {Function} loadFunction A function returning or promising an array of strings, the initial ids.
   */
  constructor (loadFunction) {
    const set = new Set()
    let loaded = false

    // private method that promises the backing set on which to operate
    this._getBackingSet = function () {
      if (loaded) {
        return Promise.resolve(set)
      }
      return new Promise((resolve) => {
        resolve(loadFunction())
      }).each((id) => {
        set.add(id)
      }).then(() => {
        loaded = true
        return set
      })
    }
  }

  /**
   * Add the given id to the set.
   *
   * @param {string} id The id to add.
   * @returns {Promise} A Promise that is resolved when done.
   */
  add (id) {
    return this._getBackingSet().then((set) => set.add(id))
  }

  /**
   * Remove the given id from the set.
   *
   * @param {string} id The id to remove.
   * @returns {Promise} A Promise that is resolved when done.
   */
  remove (id) {
    return this._getBackingSet().then((set) => set.delete(id))
  }

  /**
   * Determine whether the given id is contained in this set.
   *
   * @param {string} id The id to check.
   * @returns {Promise<boolean>} A Promise for whether the id is in this set.
   */
  includes (id) {
    return this._getBackingSet().then((set) => set.has(id))
  }

  /**
   * Iterate over all ids in this set. Iteration happens sequentially. If the
   * callback returns a Promise or thenable, it is awaited before continuing with
   * the next element.
   *
   * @param {Function} callbackFn The function to execute for each set element.
   * @returns {Promise} A Promise that is resolved when iteration is finished.
   */
  each (callbackFn) {
    return this._getBackingSet().then((set) => {
      const iter = set.values()
      /**
       * @returns {string} The recursively next element to iterate.
       */
      function next () {
        const element = iter.next()
        if (element.done) {
          return Promise.resolve()
        }
        return Promise.resolve(callbackFn(element.value)).then(next)
      }
      return next()
    })
  }
}

module.exports = IdSet
