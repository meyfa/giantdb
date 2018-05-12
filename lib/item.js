"use strict";

module.exports = Item;

/**
 * Construct a new Item.
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

Item.prototype._processStreamResult = function (result) {
    if (result.metadataChanged) {
        this.metadata = result.metadata;
    }
    return result.stream;
};

/**
 * Obtain a read stream for this item.
 *
 * @param {Object} options Middleware options.
 * @return {Promise<stream.Readable>} A Promise that resolves to a Readable.
 */
Item.prototype.getReadable = function (options) {
    return this._ioManager.createReadStream(this.id, this.metadata, options)
        .then((result) => this._processStreamResult(result));
};

/**
 * Obtain a write stream for this item.
 *
 * @param {Object} options Middleware options.
 * @return {Promise<stream.Writable>} A Promise that resolves to a Writable.
 */
Item.prototype.getWritable = function (options) {
    return this._ioManager.createWriteStream(this.id, this.metadata, options)
        .then((result) => this._processStreamResult(result));
};

/**
 * Save this item's current metadata.
 *
 * This must be called for the metadata to persist after modifications have been
 * made. Note that the metadata may also be saved on other occurrences (e.g.
 * when modified by middleware), but that is not guaranteed.
 *
 * @return {Promise} A Promise that resolves when done.
 */
Item.prototype.saveMetadata = function () {
    return this._ioManager.writeMetadata(this.id, this.metadata);
};
