"use strict";

const Promise = require("bluebird");

const crypto = require("crypto");
const cryptoRandomBytes = Promise.promisify(crypto.randomBytes);

const adapters = require("fs-adapters");

const IdSet = require("./idset");
const IOManager = require("./iomanager");
const MiddlewareManager = require("./middlewaremanager");

const Change = require("./change");
const Item = require("./item");

module.exports = DB;

/**
 * Construct a new database. The source can either be a file system adapter or
 * a directory path.
 *
 * @param {Object|string} source An adapter or directory path.
 * @constructor
 */
function DB(source) {
    if (!(this instanceof DB)) {
        return new DB(source);
    }

    this._adapter = resolveSource(source);
    this._middlewareManager = new MiddlewareManager();
    this._ioManager = new IOManager(this._adapter, this._middlewareManager);
    this._idSet = new IdSet(loadIds.bind(this));

    function loadIds() {
        return this._adapter.listFiles().filter((fileName) => {
            // ignore non-committed files
            return fileName.indexOf(".tmp") === -1
                && fileName.indexOf(".json") === -1;
        });
    }
}

DB.prototype._commit = function (id) {
    // rename the file, add its id, resolve to an Item
    return this._ioManager.publish(id).then(() => {
        return this._idSet.add(id);
    }).then(() => {
        return this.get(id);
    });
};

DB.prototype._destroy = function (id) {
    return this._ioManager.deleteTemporary(id);
};

/**
 * Register the given middleware.
 *
 * @param {Object} middleware The middleware object.
 * @return {void}
 */
DB.prototype.use = function (middleware) {
    this._middlewareManager.register(middleware);
};

/**
 * Prepare a new item. This constructs a new Change object that can be written
 * to and then committed, making the item available.
 *
 * @param {Object} options Middleware options.
 * @return {Promise<Change>} A Promise that resolves to a new Change object.
 */
DB.prototype.create = function (options) {
    // init adapter and generate id
    return this._adapter.init().then(() => generateId()).then((id) => {
        // create a temporary
        return [id, this._ioManager.createTemporary(id, options)];
    }).spread((id, out) => {
        // return the prepared Change
        return new Change(id, out, this._commit.bind(this), this._destroy.bind(this));
    });
};

/**
 * Remove an item from this database.
 *
 * @param {string} id The item's id.
 * @return {Promise} A Promise that is resolved when removal is complete.
 */
DB.prototype.remove = function (id) {
    return this._ioManager.delete(id).then(() => {
        return this._idSet.remove(id);
    });
};

/**
 * Retrieve an item in this database by id.
 *
 * @param {string} id The item's id.
 * @return {Promise<Item>} A Promise that resolves to the item if found.
 */
DB.prototype.get = function (id) {
    // check for existence first
    return this._idSet.includes(id).then((includes) => {
        if (!includes) {
            throw new Error("item does not exist: " + id);
        }
        // obtain the metadata, then construct
        return this._ioManager.readMetadata(id);
    }).then((metadata) => new Item(id, this._ioManager, metadata));
};

/**
 * Iterate over all items in this database. Iteration happens sequentially. If
 * the callback returns a Promise or thenable, it is awaited before continuing
 * with the next item.
 *
 * @param {function} callbackFn The function to execute for each item.
 * @return {Promise} A Promise that is resolved when iteration is finished.
 */
DB.prototype.each = function (callbackFn) {
    return this._idSet.each((id) => {
        return this.get(id).then((item) => callbackFn(item));
    });
};

function generateId() {
    return cryptoRandomBytes(16).then((buffer) => {
        return buffer.toString("hex");
    });
}

function resolveSource(source) {
    if (typeof source === "string") {
        return new adapters.DirectoryAdapter(source);
    }
    return source ? source : new adapters.MemoryAdapter();
}
