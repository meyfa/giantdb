'use strict'

const Promise = require('bluebird')
const JSONStream = require('JSONStream')

class IOManager {
  /**
   * Construct a new IOManager.
   *
   * @param {object} adapter The IO adapter.
   * @param {object} middlewareManager The middleware manager.
   */
  constructor (adapter, middlewareManager) {
    this._adapter = adapter
    this._middlewareManager = middlewareManager
  }

  /**
   * Create a read stream for the item with the given id. Since this step may
   * modify item metadata, the result is an object with the following properties:
   * 'stream' (the readable stream), 'metadata' (the new metadata), and
   * 'metadataChanged' (a boolean indicating whether the metadata was modified).
   *
   * @param {string} id The item id.
   * @param {object} meta The item metadata.
   * @param {object} options Middleware options.
   * @returns {Promise<object>} A Promise resolving to a result object.
   */
  createReadStream (id, meta, options) {
    return new Promise((resolve) => {
      // create the stream
      resolve(this._adapter.createReadStream(id))
    }).then((stream) => {
      // apply middleware
      return this._middlewareManager.transformReadable(stream, meta, options)
    }).then((result) => {
      // optionally write metadata and return result
      if (!result.metadataChanged) {
        return result
      }
      return this.writeMetadata(id, result.metadata).return(result)
    })
  }

  /**
   * Create a write stream for the item with the given id. Since this step may
   * modify item metadata, the result is an object with the following properties:
   * 'stream' (the writable stream), 'metadata' (the new metadata), and
   * 'metadataChanged' (a boolean indicating whether the metadata was modified).
   *
   * @param {string} id The item id.
   * @param {object} meta The item metadata.
   * @param {object} options Middleware options.
   * @returns {Promise<object>} A Promise resolving to a result object.
   */
  createWriteStream (id, meta, options) {
    return new Promise((resolve) => {
      // create the stream
      resolve(this._adapter.createWriteStream(id))
    }).then((stream) => {
      // apply middleware
      return this._middlewareManager.transformWritable(stream, meta, options)
    }).then((result) => {
      // optionally write metadata and return result
      if (!result.metadataChanged) {
        return result
      }
      return this.writeMetadata(id, result.metadata).return(result)
    })
  }

  /**
   * Create a temporary write stream to an item that can be published later.
   *
   * @param {string} id The item id.
   * @param {object} options Middleware options.
   * @returns {Promise<object>} A Promise that resolves to a Writable Stream.
   */
  createTemporary (id, options) {
    return new Promise((resolve) => {
      // create the stream
      resolve(this._adapter.createWriteStream(id + '.tmp'))
    }).then((stream) => {
      // apply middleware
      const meta = {}
      return this._middlewareManager.transformWritable(stream, meta, options)
    }).then((result) => {
      // write the metadata and return the stream
      return this.writeMetadata(id, result.metadata).return(result.stream)
    })
  }

  /**
   * Mark the item with the given id as non-temporary as part of the commit
   * process.
   *
   * @param {string} id The item id.
   * @returns {Promise} A Promise that resolves when done.
   */
  publish (id) {
    return this._adapter.rename(id + '.tmp', id)
  }

  /**
   * Delete all data for the item with the given id.
   *
   * @param {string} id The item id.
   * @returns {Promise} A Promise that resolves when done.
   */
  delete (id) {
    return Promise.all([
      this._adapter.delete(id),
      this._adapter.delete(id + '.json')
    ])
  }

  /**
   * Delete the temporary item with the given id.
   *
   * @param {string} id The item id.
   * @returns {Promise} A Promise that resolves when done.
   */
  deleteTemporary (id) {
    return Promise.all([
      this._adapter.delete(id + '.tmp'),
      this._adapter.delete(id + '.json').catch((err) => {
        // ignore missing metadata file
        if (err.code !== 'ENOENT') {
          throw err
        }
      })
    ])
  }

  /**
   * Read the metadata object for the item with the given id.
   *
   * @param {string} id The item's id.
   * @returns {Promise<object>} A Promise that resolves to the metadata.
   */
  readMetadata (id) {
    return new Promise((resolve, reject) => {
      const stream = this._adapter.createReadStream(id + '.json')
      const json = stream.pipe(JSONStream.parse())
      json.on('error', reject)
      json.on('data', (data) => resolve(data))
    })
  }

  /**
   * Write a metadata object for the item with the given id.
   *
   * @param {string} id The item's id.
   * @param {object} metadata The metadata to write.
   * @returns {Promise} A Promise that resolves when done.
   */
  writeMetadata (id, metadata) {
    return new Promise((resolve, reject) => {
      const stream = this._adapter.createWriteStream(id + '.json')
      stream.on('error', reject)
      stream.on('finish', resolve)
      stream.end(JSON.stringify(metadata), 'utf8')
    })
  }
}

module.exports = IOManager
