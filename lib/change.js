"use strict";

const Promise = require("bluebird");

const util = require("util");
const Writable = require("stream").Writable;

module.exports = Change;

/**
 * Creates a new Change.
 *
 * @param {string} id The ID of the new item.
 * @param {stream.Writable} writeStream The output stream to write to.
 * @param {function} committer The function used for committing.
 * @constructor
 */
function Change(id, writeStream, committer) {
    if (!(this instanceof Change)) {
        return new Change(id);
    }
    Writable.call(this);

    this.id = id;
    this.committed = false;

    this._writeStream = writeStream;
    this._committer = committer;
    this._result = null;

    // forward errors
    this._writeStream.on("error", (err) => this.emit("error", err));
}

util.inherits(Change, Writable);

/**
 * @override
 */
Change.prototype._write = function (chunk, encoding, callback) {
    this._writeStream.write(chunk, encoding, callback);
};

/**
 * @override
 */
Change.prototype._destroy = function (err, callback) {
    this._writeStream.destroy(err);
    callback();
};

/**
 * @override
 */
Change.prototype._final = function (callback) {
    this.committed = true;
    this._writeStream.end((err) => {
        if (err) {
            return callback(err);
        }
        Promise.resolve(this._committer(this.id)).then((value) => {
            this._result = value;
            callback();
        }).catch((err1) => callback(err1));
    });
};

/**
 * Commits this change. This ends the output and makes the item available.
 *
 * @return {Promise} A Promise that resolves to an Item, or rejects on error.
 */
Change.prototype.commit = function () {
    if (this.committed) {
        return Promise.reject(new Error("already committed"));
    }
    this.committed = true;
    return new Promise((resolve, reject) => {
        this.once("error", reject);
        this.once("finish", () => resolve(this._result));
        this.end();
    });
};
