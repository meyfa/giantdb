'use strict'

const WritableWrapper = require('writable-wrapper')

class Change extends WritableWrapper {
  /**
   * Constructs a new Change.
   *
   * @param {string} id The ID of the new item.
   * @param {object} writeStream The output stream to write to.
   * @param {Function} committer The function used for committing.
   * @param {Function} destroyer The function used for destruction.
   */
  constructor (id, writeStream, committer, destroyer) {
    super(writeStream)

    this.id = id
    this.committed = false
    this.destroyed = false

    this._finished = false

    this._committer = committer
    this._destroyer = destroyer

    this.on('error', () => {
      if (!this.committed && !this.destroyed) {
        this.destroyed = true
        this._destroyer()
      }
    })

    this.on('finish', () => {
      this._finished = true
    })
  }

  /**
   * Commit this change. This ends the output and makes the item available.
   *
   * @returns {Promise} A Promise that resolves to an Item, or rejects on error.
   */
  async commit () {
    if (this.destroyed) {
      throw new Error('already destroyed')
    }
    if (this.committed) {
      throw new Error('already committed')
    }

    this.committed = true

    try {
      await this._finalizeBeforeCommit()
    } catch (err) {
      if (!this.destroyed) {
        this.destroyed = true
        await this._destroyer()
      }
      throw err
    }

    return this._committer()
  }

  async _finalizeBeforeCommit () {
    if (this._finished) {
      return
    }
    await new Promise((resolve, reject) => {
      this.once('error', reject)
      this.once('finish', resolve)
      this.end()
    })
  }
}

module.exports = Change
