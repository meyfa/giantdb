"use strict";

const Promise = require("bluebird");

const WritableWrapper = require("writable-wrapper");

class Change extends WritableWrapper {
    /**
     * Constructs a new Change.
     *
     * @param {string} id The ID of the new item.
     * @param {stream.Writable} writeStream The output stream to write to.
     * @param {function} committer The function used for committing.
     * @param {function} destroyer The function used for destruction.
     */
    constructor (id, writeStream, committer, destroyer) {
        super(writeStream);

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

    /**
     * Commit this change. This ends the output and makes the item available.
     *
     * @return {Promise} A Promise that resolves to an Item, or rejects on error.
     */
    commit () {
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
        }).catch((err) => {
            if (!this.destroyed) {
                this.destroyed = true;
                return Promise.resolve(this._destroyer(this.id)).thenThrow(err);
            }
            throw err;
        });
    }
}

module.exports = Change;
