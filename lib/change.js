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

    this._changeFinished = false
    this._committer = committer
    this._destroyer = destroyer

    this.on('error', () => {
      if (this._destroyer) {
        this._destroyer()
        this._committer = null
        this._destroyer = null
      }
    })

    this.on('finish', () => {
      this._changeFinished = true
    })
  }

  /**
   * Commit this change. This ends the output and makes the item available.
   *
   * @returns {Promise} A Promise that resolves to an Item, or rejects on error.
   */
  async commit () {
    if (!this._committer) {
      throw new Error('invalid state')
    }

    const committer = this._committer
    const destroyer = this._destroyer
    this._committer = null
    this._destroyer = null

    try {
      await this._finalizeBeforeCommit()
    } catch (err) {
      if (destroyer) {
        await destroyer()
      }
      throw err
    }

    return committer()
  }

  async _finalizeBeforeCommit () {
    if (this._changeFinished) {
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
