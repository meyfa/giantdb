"use strict";

module.exports = Item;

/**
 * Constructs a new Item.
 *
 * @param {string} id The item id.
 * @param {IOManager} ioManager The IO manager.
 * @constructor
 */
function Item(id, ioManager) {
    this.id = id;

    this._ioManager = ioManager;
}

/**
 * Creates a read stream for this item.
 *
 * @return {stream.Readable} A readable stream for reading this item.
 */
Item.prototype.createReadStream = function () {
    return this._ioManager.createReadStream(this.id);
};

/**
 * Creates a write stream for this item.
 *
 * @return {stream.Writable} A readable stream for writing to this item.
 */
Item.prototype.createWriteStream = function () {
    return this._ioManager.createWriteStream(this.id);
};
