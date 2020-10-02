'use strict'

const MiddlewareTransformable = require('./transformable')

/**
 * Invoke the specified middleware function with the given parameters.
 *
 * @param {object} middleware The middleware object.
 * @param {string} funcName The name of the middleware function.
 * @param {object} stream The stream to pass to the middleware.
 * @param {object} meta The metadata to pass to the middleware.
 * @param {object} options The options to pass to the middleware.
 * @returns {Promise} Resolves to the middleware return value.
 */
function invokeMiddleware (middleware, funcName, stream, meta, options) {
  const func = middleware[funcName]
  if (typeof func !== 'function') {
    return
  }
  return new Promise((resolve, reject) => {
    func.call(middleware, stream, meta, options, (err, result) => {
      if (err) reject(err)
      else resolve(result)
    })
  })
}

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
  async transformReadable (stream, meta, options) {
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
  async transformWritable (stream, meta, options) {
    return this._transform('transformWritable', stream, meta, options)
  }

  async _transform (funcName, stream, meta, options) {
    const obj = new MiddlewareTransformable(stream, meta)

    // sequentially update inputs with each middleware
    for (const mw of this.middlewares) {
      const result = await invokeMiddleware(mw, funcName, obj.stream, obj.metadata, options)
      obj.update(result)
    }

    // return the transformed result
    return obj
  }
}

module.exports = MiddlewareManager
