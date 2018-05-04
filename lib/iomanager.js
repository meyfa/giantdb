"use strict";

module.exports = IOManager;

/**
 * Constructs a new IOManager.
 *
 * @param {Object} adapter The IO adapter.
 * @constructor
 */
function IOManager(adapter) {
    if (!(this instanceof IOManager)) {
        return new IOManager(adapter);
    }

    this._adapter = adapter;
}

/**
 * Creates a read stream for the item with the given id.
 *
 * @param {string} id The item id.
 * @return {stream.Readable} A readable stream.
 */
IOManager.prototype.createReadStream = function (id) {
    return this._adapter.createReadStream(id);
};

/**
 * Creates a write stream for the item with the given id.
 *
 * @param {string} id The item id.
 * @return {stream.Writable} A writable stream.
 */
IOManager.prototype.createWriteStream = function (id) {
    return this._adapter.createWriteStream(id);
};

/**
 * Creates a temporary write stream to an item that can be published later.
 *
 * @param {string} id The item id.
 * @return {stream.Writable} A writable stream.
 */
IOManager.prototype.createTemporary = function (id) {
    return this._adapter.createWriteStream(id + ".tmp");
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
    return this._adapter.delete(id);
};

/**
 * Creates a temporary write stream to an item that can be published later.
 *
 * @param {string} id The item id.
 * @return {stream.Writable} A writable stream.
 */
IOManager.prototype.deleteTemporary = function (id) {
    return this._adapter.delete(id + ".tmp");
};
