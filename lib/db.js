'use strict'

const Promise = require('bluebird')

const crypto = require('crypto')
const cryptoRandomBytes = Promise.promisify(crypto.randomBytes)

const adapters = require('fs-adapters')

const IdSet = require('./idset')
const IOManager = require('./iomanager')
const MiddlewareManager = require('./middlewaremanager')

const Change = require('./change')
const Item = require('./item')

/**
 * @returns {string} The generated id.
 */
function generateId () {
  return cryptoRandomBytes(16).then((buffer) => {
    return buffer.toString('hex')
  })
}

/**
 * @param {*} source The raw source.
 * @returns {object} An adapter for the source.
 */
function resolveSource (source) {
  if (typeof source === 'string') {
    return new adapters.DirectoryAdapter(source)
  }
  return source || new adapters.MemoryAdapter()
}

class DB {
  /**
   * Construct a new database. The source can either be a file system adapter or
   * a directory path.
   *
   * @param {object|string} source An adapter or directory path.
   */
  constructor (source) {
    this._adapter = resolveSource(source)
    this._middlewareManager = new MiddlewareManager()
    this._ioManager = new IOManager(this._adapter, this._middlewareManager)
    this._idSet = new IdSet(loadIds.bind(this))

    /**
     * @returns {string[]} An array of item ids.
     */
    function loadIds () {
      return Promise.resolve(this._adapter.listFiles()).filter((fileName) => {
        // ignore non-committed files
        return fileName.indexOf('.tmp') === -1 && fileName.indexOf('.json') === -1
      })
    }
  }

  _commit (id) {
    // rename the file, add its id, resolve to an Item
    return this._ioManager.publish(id).then(() => {
      return this._idSet.add(id)
    }).then(() => {
      return this.get(id)
    })
  }

  _destroy (id) {
    return this._ioManager.deleteTemporary(id)
  }

  /**
   * Register the given middleware.
   *
   * @param {object} middleware The middleware object.
   * @returns {void}
   */
  use (middleware) {
    this._middlewareManager.register(middleware)
  }

  /**
   * Prepare a new item. This constructs a new Change object that can be written
   * to and then committed, making the item available.
   *
   * @param {object} options Middleware options.
   * @returns {Promise<Change>} A Promise that resolves to a new Change object.
   */
  create (options) {
    // init adapter and generate id
    return Promise.resolve(this._adapter.init()).then(() => {
      return generateId()
    }).then((id) => {
      // create a temporary
      return [id, this._ioManager.createTemporary(id, options)]
    }).spread((id, out) => {
      // return the prepared Change
      return new Change(id, out, this._commit.bind(this), this._destroy.bind(this))
    })
  }

  /**
   * Remove an item from this database.
   *
   * @param {string} id The item's id.
   * @returns {Promise} A Promise that is resolved when removal is complete.
   */
  remove (id) {
    return this._ioManager.delete(id).then(() => {
      return this._idSet.remove(id)
    })
  }

  /**
   * Retrieve an item in this database by id.
   *
   * @param {string} id The item's id.
   * @returns {Promise<Item>} A Promise that resolves to the item if found.
   */
  get (id) {
    // check for existence first
    return this._idSet.includes(id).then((includes) => {
      if (!includes) {
        throw new Error('item does not exist: ' + id)
      }
      // obtain the metadata, then construct
      return this._ioManager.readMetadata(id)
    }).then((metadata) => new Item(id, this._ioManager, metadata))
  }

  /**
   * Iterate over all items in this database. Iteration happens sequentially. If
   * the callback returns a Promise or thenable, it is awaited before continuing
   * with the next item.
   *
   * @param {Function} callbackFn The function to execute for each item.
   * @returns {Promise} A Promise that is resolved when iteration is finished.
   */
  each (callbackFn) {
    return this._idSet.each((id) => {
      return this.get(id).then((item) => callbackFn(item))
    })
  }
}

module.exports = DB
