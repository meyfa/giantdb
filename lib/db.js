'use strict'

const crypto = require('crypto')
const cryptoRandomBytes = require('util').promisify(crypto.randomBytes)

const { DirectoryAdapter, MemoryAdapter } = require('fs-adapters')

const IdSet = require('./idset')
const IOManager = require('./iomanager')
const MiddlewareManager = require('./middlewaremanager')

const Change = require('./change')
const Item = require('./item')

/**
 * @returns {Promise<string>} Resolves to the generated id.
 */
async function generateId () {
  const buffer = await cryptoRandomBytes(16)
  return buffer.toString('hex')
}

/**
 * @param {*} source The raw source.
 * @returns {object} An adapter for the source.
 */
function resolveSource (source) {
  if (typeof source === 'string') {
    return new DirectoryAdapter(source)
  }
  return source || new MemoryAdapter()
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

    this._idSet = new IdSet(async () => {
      const files = await this._adapter.listFiles()
      return files.filter((fileName) => {
        // ignore non-committed files
        return fileName.indexOf('.tmp') === -1 && fileName.indexOf('.json') === -1
      })
    })
  }

  async _commit (id) {
    // rename the file, add its id, resolve to an Item
    await this._ioManager.publish(id)
    await this._idSet.add(id)
    return this.get(id)
  }

  async _destroy (id) {
    await this._ioManager.deleteTemporary(id)
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
  async create (options) {
    await this._adapter.init()
    const id = await generateId()

    const out = await this._ioManager.createTemporary(id, options)

    return new Change(id, out, () => this._commit(id), () => this._destroy(id))
  }

  /**
   * Remove an item from this database.
   *
   * @param {string} id The item's id.
   * @returns {Promise} A Promise that is resolved when removal is complete.
   */
  async remove (id) {
    await this._ioManager.delete(id)
    await this._idSet.remove(id)
  }

  /**
   * Retrieve an item in this database by id.
   *
   * @param {string} id The item's id.
   * @returns {Promise<Item>} A Promise that resolves to the item if found.
   */
  async get (id) {
    // check for existence first
    if (!await this._idSet.includes(id)) {
      throw new Error('item does not exist: ' + id)
    }
    // obtain the metadata, then construct
    const metadata = await this._ioManager.readMetadata(id)
    return new Item(id, this._ioManager, metadata)
  }

  /**
   * Iterate over all items in this database. Iteration happens sequentially. If
   * the callback returns a Promise or thenable, it is awaited before continuing
   * with the next item.
   *
   * @param {Function} callbackFn The function to execute for each item.
   * @returns {Promise} A Promise that is resolved when iteration is finished.
   */
  async each (callbackFn) {
    await this._idSet.each(async (id) => {
      const item = await this.get(id)
      await callbackFn(item)
    })
  }
}

module.exports = DB
