"use strict";

const Promise = require("bluebird");

module.exports = IdSet;

/**
 * Constructs a new IdSet. The load function is used to obtain the initial list
 * of ids.
 *
 * @param {function} loadFunction A function returning or promising an
 *     array of strings, the initial ids.
 * @constructor
 */
function IdSet(loadFunction) {
    if (!(this instanceof IdSet)) {
        return new IdSet(loadFunction);
    }

    const set = new Set();
    let loaded = false;

    // private method that promises the backing set on which to operate
    this._getBackingSet = function () {
        if (loaded) {
            return Promise.resolve(set);
        }
        return new Promise((resolve) => {
            resolve(loadFunction());
        }).each((id) => {
            set.add(id);
        }).then(() => {
            loaded = true;
            return set;
        });
    };
}

/**
 * Adds the given id to the set.
 *
 * @param {string} id The id to add.
 * @return {Promise} A Promise that is resolved when done.
 */
IdSet.prototype.add = function (id) {
    return this._getBackingSet().then((set) => {
        set.add(id);
    });
};

/**
 * Removes the given id from the set.
 *
 * @param {string} id The id to remove.
 * @return {Promise} A Promise that is resolved when done.
 */
IdSet.prototype.remove = function (id) {
    return this._getBackingSet().then((set) => {
        set.delete(id);
    });
};

/**
 * Determines whether the given id is contained in this set.
 *
 * @param {string} id The id to check.
 * @return {Promise<boolean>} A Promise for whether the id is in this set.
 */
IdSet.prototype.includes = function (id) {
    return this._getBackingSet().then((set) => {
        return set.has(id);
    });
};
