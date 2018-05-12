"use strict";

const Promise = require("bluebird");

module.exports = IdSet;

/**
 * Construct a new IdSet. The load function is used to obtain the initial list
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
 * Add the given id to the set.
 *
 * @param {string} id The id to add.
 * @return {Promise} A Promise that is resolved when done.
 */
IdSet.prototype.add = function (id) {
    return this._getBackingSet().then((set) => set.add(id));
};

/**
 * Remove the given id from the set.
 *
 * @param {string} id The id to remove.
 * @return {Promise} A Promise that is resolved when done.
 */
IdSet.prototype.remove = function (id) {
    return this._getBackingSet().then((set) => set.delete(id));
};

/**
 * Determine whether the given id is contained in this set.
 *
 * @param {string} id The id to check.
 * @return {Promise<boolean>} A Promise for whether the id is in this set.
 */
IdSet.prototype.includes = function (id) {
    return this._getBackingSet().then((set) => set.has(id));
};

/**
 * Iterate over all ids in this set. Iteration happens sequentially. If the
 * callback returns a Promise or thenable, it is awaited before continuing with
 * the next element.
 *
 * @param {function} callbackFn The function to execute for each set element.
 * @return {Promise} A Promise that is resolved when iteration is finished.
 */
IdSet.prototype.each = function (callbackFn) {
    return this._getBackingSet().then((set) => {
        const iter = set.values();
        function next() {
            const element = iter.next();
            if (element.done) {
                return Promise.resolve();
            }
            return Promise.resolve(callbackFn(element.value))
                .then(next);
        }
        return next();
    });
};
