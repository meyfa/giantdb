"use strict";

const Promise = require("bluebird");

module.exports = MiddlewareManager;

/**
 * Constructs a new MiddlewareManager.
 *
 * @constructor
 */
function MiddlewareManager() {
    if (!(this instanceof MiddlewareManager)) {
        return new MiddlewareManager();
    }

    this.middlewares = [];
}

/**
 * Register a new middleware.
 *
 * @param {Object} middleware The middleware.
 * @return {void}
 */
MiddlewareManager.prototype.register = function (middleware) {
    this.middlewares.push(middleware);
};

/**
 * Transform the given stream and metadata by applying every middleware's
 * 'transformReadable' function.
 *
 * The result is an object with the keys 'stream', 'metadata' and
 * 'metadataChanged'. The first two are the respective transformation results,
 * while the third indicates whether the metadata was touched at all (to help
 * with optimizations).
 *
 * @param {stream.Readable} stream The base Readable.
 * @param {Object} meta The item metadata.
 * @param {Object} options The user-provided options object.
 * @return {Promise<Object>} A Promise that resolves to a transformation result.
 */
MiddlewareManager.prototype.transformReadable = function (stream, meta, options) {
    return this._transform("transformReadable", stream, meta, options);
};

/**
 * Transform the given stream and metadata by applying every middleware's
 * 'transformWritable' function.
 *
 * The result is an object with the keys 'stream', 'metadata' and
 * 'metadataChanged'. The first two are the respective transformation results,
 * while the third indicates whether the metadata was touched at all (to help
 * with optimizations).
 *
 * @param {stream.Writable} stream The base Writable.
 * @param {Object} meta The item metadata.
 * @param {Object} options The user-provided options object.
 * @return {Promise<Object>} A Promise that resolves to a transformation result.
 */
MiddlewareManager.prototype.transformWritable = function (stream, meta, options) {
    return this._transform("transformWritable", stream, meta, options);
};

MiddlewareManager.prototype._transform = function (func, stream, meta, options) {
    // create copy of inputs
    let _stream = stream, _meta = meta;

    let metadataChanged = false;

    return Promise.all(this.middlewares).each((middleware) => {
        return new Promise((resolve) => {
            // skip if function not available
            if (typeof middleware[func] !== "function") {
                return resolve();
            }
            // call the function
            middleware[func](_stream, _meta, options, (result) => {
                // update inputs
                if (result && result.stream) {
                    _stream = result.stream;
                }
                if (result && result.metadata) {
                    _meta = result.metadata;
                    metadataChanged = true;
                }

                // continue with next middleware
                resolve();
            });
        });
    }).then(() => {
        // return the transformed result
        return {
            metadata: _meta,
            metadataChanged: metadataChanged,
            stream: _stream,
        };
    });
};
