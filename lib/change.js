"use strict";

const Promise = require("bluebird");

const util = require("util");
const WritableWrapper = require("writable-wrapper");

module.exports = Change;

/**
 * Constructs a new Change.
 *
 * @param {string} id The ID of the new item.
 * @param {stream.Writable} writeStream The output stream to write to.
 * @param {function} committer The function used for committing.
 * @param {function} destroyer The function used for destruction.
 * @constructor
 */
function Change(id, writeStream, committer, destroyer) {
    if (!(this instanceof Change)) {
        return new Change(id, writeStream, committer, destroyer);
    }
    WritableWrapper.call(this, writeStream);

    this.id = id;
    this.committed = false;
    this.destroyed = false;

    this._finished = false;

    this._committer = committer;
    this._destroyer = destroyer;

    this.on("error", () => {
        if (this.committed || this.destroyed) {
            return;
        }
        this.destroyed = true;
        this._destroyer(this.id);
    });

    this.on("finish", () => {
        this._finished = true;
    });
}

util.inherits(Change, WritableWrapper);

/**
 * Commits this change. This ends the output and makes the item available.
 *
 * @return {Promise} A Promise that resolves to an Item, or rejects on error.
 */
Change.prototype.commit = function () {
    if (this.destroyed) {
        return Promise.reject(new Error("already destroyed"));
    }
    if (this.committed) {
        return Promise.reject(new Error("already committed"));
    }
    this.committed = true;
    return new Promise((resolve, reject) => {
        if (this._finished) {
            return resolve();
        }
        this.once("error", reject);
        this.once("finish", resolve);
        this.end();
    }).then(() => {
        return Promise.resolve(this._committer(this.id));
    }).catch(() => {
        if (this.destroyed) {
            return;
        }
        this.destroyed = true;
        return Promise.resolve(this._destroyer(this.id)).then(() => {
            throw err;
        });
    });
};
