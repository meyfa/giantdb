"use strict";

module.exports = Item;

/**
 * Constructs a new Item.
 *
 * @param {string} id The item id.
 * @param {IOManager} ioManager The IO manager.
 * @param {Object} metadata An object containing item metadata.
 * @constructor
 */
function Item(id, ioManager, metadata) {
    this.id = id;
    this.metadata = metadata;

    this._ioManager = ioManager;
}

/**
 * Obtains a read stream for this item.
 *
 * @param {Object} options Middleware options.
 * @return {Promise<stream.Readable>} A Promise that resolves to a Readable.
 */
Item.prototype.getReadable = function (options) {
    return this._ioManager.createReadStream(this.id, this.metadata, options);
};

/**
 * Obtains a write stream for this item.
 *
 * @param {Object} options Middleware options.
 * @return {Promise<stream.Writable>} A Promise that resolves to a Writable.
 */
Item.prototype.getWritable = function (options) {
    return this._ioManager.createWriteStream(this.id, this.metadata, options);
};
