"use strict";

class Item {
    /**
     * Construct a new Item.
     *
     * @param {string} id The item id.
     * @param {IOManager} ioManager The IO manager.
     * @param {Object} metadata An object containing item metadata.
     */
    constructor (id, ioManager, metadata) {
        this.id = id;
        this.metadata = metadata;

        this._ioManager = ioManager;
    }

    _processStreamResult (result) {
        if (result.metadataChanged) {
            this.metadata = result.metadata;
        }
        return result.stream;
    }

    /**
     * Obtain a read stream for this item.
     *
     * @param {Object} options Middleware options.
     * @return {Promise<stream.Readable>} A Promise that resolves to a Readable.
     */
    getReadable (options) {
        return this._ioManager.createReadStream(this.id, this.metadata, options)
            .then((result) => this._processStreamResult(result));
    }

    /**
     * Obtain a write stream for this item.
     *
     * @param {Object} options Middleware options.
     * @return {Promise<stream.Writable>} A Promise that resolves to a Writable.
     */
    getWritable (options) {
        return this._ioManager.createWriteStream(this.id, this.metadata, options)
            .then((result) => this._processStreamResult(result));
    }

    /**
     * Save this item's current metadata.
     *
     * This must be called for the metadata to persist after modifications have been
     * made. Note that the metadata may also be saved on other occurrences (e.g.
     * when modified by middleware), but that is not guaranteed.
     *
     * @return {Promise} A Promise that resolves when done.
     */
    saveMetadata () {
        return this._ioManager.writeMetadata(this.id, this.metadata);
    }
}

module.exports = Item;
