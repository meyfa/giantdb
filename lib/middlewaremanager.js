'use strict'

const Promise = require('bluebird')

class MiddlewareManager {
  /**
   * Construct a new MiddlewareManager.
   */
  constructor () {
    this.middlewares = []
  }

  /**
   * Register a new middleware.
   *
   * @param {object} middleware The middleware.
   * @returns {void}
   */
  register (middleware) {
    this.middlewares.push(middleware)
  }

  /**
   * Transform the given stream and metadata by applying every middleware's
   * 'transformReadable' function.
   *
   * The result is an object with the keys 'stream', 'metadata' and
   * 'metadataChanged'. The first two are the respective transformation results,
   * while the third indicates whether the metadata was touched at all (to help
   * with optimizations).
   *
   * @param {object} stream The base Readable Stream.
   * @param {object} meta The item metadata.
   * @param {object} options The user-provided options object.
   * @returns {Promise<object>} A Promise that resolves to a transformation result.
   */
  transformReadable (stream, meta, options) {
    return this._transform('transformReadable', stream, meta, options)
  }

  /**
   * Transform the given stream and metadata by applying every middleware's
   * 'transformWritable' function.
   *
   * The result is an object with the keys 'stream', 'metadata' and
   * 'metadataChanged'. The first two are the respective transformation results,
   * while the third indicates whether the metadata was touched at all (to help
   * with optimizations).
   *
   * @param {object} stream The base Writable Stream.
   * @param {object} meta The item metadata.
   * @param {object} options The user-provided options object.
   * @returns {Promise<object>} A Promise that resolves to a transformation result.
   */
  transformWritable (stream, meta, options) {
    return this._transform('transformWritable', stream, meta, options)
  }

  _transform (funcName, stream, meta, options) {
    // create copy of inputs
    let _stream = stream
    let _meta = meta

    let metadataChanged = false

    return Promise.all(this.middlewares).each((middleware) => {
      const func = middleware[funcName]
      // skip if function not available
      if (typeof func !== 'function') {
        return
      }
      const invocation = func.bind(middleware, _stream, _meta, options)
      return Promise.fromCallback(invocation).then((result) => {
        // update inputs
        if (result && result.stream) {
          _stream = result.stream
        }
        if (result && result.metadata) {
          _meta = result.metadata
          metadataChanged = true
        }
      })
    }).then(() => {
      // return the transformed result
      return {
        metadata: _meta,
        metadataChanged: metadataChanged,
        stream: _stream
      }
    })
  }
}

module.exports = MiddlewareManager
