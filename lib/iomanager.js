"use strict";

const Promise = require("bluebird");

const JSONStream = require("JSONStream");

module.exports = IOManager;

/**
 * Constructs a new IOManager.
 *
 * @param {Object} adapter The IO adapter.
 * @param {MiddlewareManager} middlewareManager The middleware manager.
 * @constructor
 */
function IOManager(adapter, middlewareManager) {
    if (!(this instanceof IOManager)) {
        return new IOManager(adapter);
    }

    this._adapter = adapter;
    this._middlewareManager = middlewareManager;
}

/**
 * Creates a read stream for the item with the given id. Since this step may
 * modify item metadata, the result is an object with the following properties:
 * 'stream' (the readable stream), 'metadata' (the new metadata), and
 * 'metadataChanged' (a boolean indicating whether the metadata was modified).
 *
 * @param {string} id The item id.
 * @param {Object} meta The item metadata.
 * @param {Object} options Middleware options.
 * @return {Promise<Object>} A Promise resolving to a result object.
 */
IOManager.prototype.createReadStream = function (id, meta, options) {
    return new Promise((resolve) => {
        // create the stream
        resolve(this._adapter.createReadStream(id));
    }).then((stream) => {
        // apply middleware
        return this._middlewareManager.transformReadable(stream, meta, options);
    }).then((result) => {
        // optionally write metadata and return result
        if (!result.metadataChanged) {
            return result;
        }
        return this.writeMetadata(id, result.metadata).return(result);
    });
};

/**
 * Creates a write stream for the item with the given id. Since this step may
 * modify item metadata, the result is an object with the following properties:
 * 'stream' (the writable stream), 'metadata' (the new metadata), and
 * 'metadataChanged' (a boolean indicating whether the metadata was modified).
 *
 * @param {string} id The item id.
 * @param {Object} meta The item metadata.
 * @param {Object} options Middleware options.
 * @return {Promise<Object>} A Promise resolving to a result object.
 */
IOManager.prototype.createWriteStream = function (id, meta, options) {
    return new Promise((resolve) => {
        // create the stream
        resolve(this._adapter.createWriteStream(id));
    }).then((stream) => {
        // apply middleware
        return this._middlewareManager.transformWritable(stream, meta, options);
    }).then((result) => {
        // optionally write metadata and return result
        if (!result.metadataChanged) {
            return result;
        }
        return this.writeMetadata(id, result.metadata).return(result);
    });
};

/**
 * Creates a temporary write stream to an item that can be published later.
 *
 * @param {string} id The item id.
 * @param {Object} options Middleware options.
 * @return {Promise<stream.Writable>} A Promise that resolves to a Writable.
 */
IOManager.prototype.createTemporary = function (id, options) {
    return new Promise((resolve) => {
        // create the stream
        resolve(this._adapter.createWriteStream(id + ".tmp"));
    }).then((stream) => {
        // apply middleware
        const meta = {};
        return this._middlewareManager.transformWritable(stream, meta, options);
    }).then((result) => {
        // write the metadata and return the stream
        return this.writeMetadata(id, result.metadata)
            .return(result.stream);
    });
};

/**
 * Marks the item with the given id as non-temporary as part of the commit
 * process.
 *
 * @param {string} id The item id.
 * @return {Promise} A Promise that resolves when done.
 */
IOManager.prototype.publish = function (id) {
    return this._adapter.rename(id + ".tmp", id);
};

/**
 * Deletes all data for the item with the given id.
 *
 * @param {string} id The item id.
 * @return {Promise} A Promise that resolves when done.
 */
IOManager.prototype.delete = function (id) {
    return Promise.all([
        this._adapter.delete(id),
        this._adapter.delete(id + ".json"),
    ]);
};

/**
 * Deletes the temporary item with the given id.
 *
 * @param {string} id The item id.
 * @return {Promise} A Promise that resolves when done.
 */
IOManager.prototype.deleteTemporary = function (id) {
    return Promise.all([
        this._adapter.delete(id + ".tmp"),
        this._adapter.delete(id + ".json").catch((err) => {
            // ignore missing metadata file
            if (err.code !== "ENOENT") {
                throw err;
            }
        }),
    ]);
};

/**
 * Reads the metadata object for the item with the given id.
 *
 * @param {string} id The item's id.
 * @return {Promise<Object>} A Promise that resolves to the metadata.
 */
IOManager.prototype.readMetadata = function (id) {
    return new Promise((resolve, reject) => {
        const stream = this._adapter.createReadStream(id + ".json");
        const json = stream.pipe(JSONStream.parse());
        json.on("error", reject);
        json.on("data", (data) => resolve(data));
    });
};

/**
 * Writes a metadata object for the item with the given id.
 *
 * @param {string} id The item's id.
 * @param {Object} metadata The metadata to write.
 * @return {Promise} A Promise that resolves when done.
 */
IOManager.prototype.writeMetadata = function (id, metadata) {
    return new Promise((resolve, reject) => {
        const stream = this._adapter.createWriteStream(id + ".json");
        stream.on("error", reject);
        stream.on("finish", resolve);
        stream.end(JSON.stringify(metadata), "utf8");
    });
};
