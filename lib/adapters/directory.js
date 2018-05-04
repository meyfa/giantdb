"use strict";

const Promise = require("bluebird");

const path = require("path");

const fs = require("fs");
const fsMkdir = Promise.promisify(fs.mkdir);
const fsReaddir = Promise.promisify(fs.readdir);
const fsRename = Promise.promisify(fs.rename);
const fsUnlink = Promise.promisify(fs.unlink);

module.exports = DirectoryAdapter;

/**
 * Constructs a new DirectoryAdapter.
 *
 * @param {string} directory The path to the directory.
 * @constructor
 */
function DirectoryAdapter(directory) {
    if (!(this instanceof DirectoryAdapter)) {
        return new DirectoryAdapter(directory);
    }

    this.directory = directory;
}

DirectoryAdapter.prototype._resolve = function (fileName) {
    return path.join(this.directory, fileName);
};

/**
 * Initialize this adapter.
 *
 * @return {Promise} A Promise for when initialization is done.
 */
DirectoryAdapter.prototype.init = function () {
    return fsMkdir(this.directory).catch((err) => {
        // ignore existing directory
        if (err.code !== "EEXIST") {
            throw err;
        }
    });
};

/**
 * Obtain a list of file names accessible through this adapter.
 *
 * @return {Promise<string[]>} A Promise that resolves to a file name array.
 */
DirectoryAdapter.prototype.listFiles = function () {
    return fsReaddir(this.directory).catch((err) => {
        // ignore missing directory, simply return empty array
        if (err.code !== "ENOENT") {
            throw err;
        }
        return [];
    });
};

/**
 * Create a read stream for the given file name.
 *
 * @param {string} fileName The name of the file to read.
 * @return {stream.Readable} A readable stream for the file.
 */
DirectoryAdapter.prototype.createReadStream = function (fileName) {
    return fs.createReadStream(this._resolve(fileName));
};

/**
 * Create a write stream for the given file name.
 *
 * @param {string} fileName The name of the file to write.
 * @return {stream.Writable} A writable stream for the file.
 */
DirectoryAdapter.prototype.createWriteStream = function (fileName) {
    return fs.createWriteStream(this._resolve(fileName));
};

/**
 * Rename a file.
 *
 * @param {string} fileName The old file name.
 * @param {string} newFileName The new file name.
 * @return {Promise} A Promise that resolves when done, or rejects on error.
 */
DirectoryAdapter.prototype.rename = function (fileName, newFileName) {
    return fsRename(this._resolve(fileName), this._resolve(newFileName));
};

/**
 * Delete a file.
 *
 * @param {string} fileName The name of the file to delete.
 * @return {Promise} A Promise that resolves when done, or rejects on error.
 */
DirectoryAdapter.prototype.delete = function (fileName) {
    return fsUnlink(this._resolve(fileName));
};