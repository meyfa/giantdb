"use strict";

const Promise = require("bluebird");

const util = require("util");
const WritableWrapper = require("writable-wrapper");

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
        return new Change(id, writeStream, committer);
    }
    WritableWrapper.call(this, writeStream);

    this.id = id;
    this.committed = false;

    this._committer = committer;
    this._result = null;
}

util.inherits(Change, WritableWrapper);

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
        this.once("finish", resolve);
        this.end();
    }).then(() => {
        return Promise.resolve(this._committer(this.id));
    });
};
