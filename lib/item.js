'use strict'

class Item {
  /**
   * Construct a new Item.
   *
   * @param {string} id The item id.
   * @param {object} ioManager The IO manager.
   * @param {object} metadata An object containing item metadata.
   */
  constructor (id, ioManager, metadata) {
    this.id = id
    this.metadata = metadata

    this._ioManager = ioManager
  }

  _processStreamResult (result) {
    if (result.metadataChanged) {
      this.metadata = result.metadata
    }
    return result.stream
  }

  /**
   * Obtain a read stream for this item.
   *
   * @param {object} options Middleware options.
   * @returns {Promise<object>} A Promise that resolves to a Readable Stream.
   */
  async getReadable (options) {
    const result = await this._ioManager.createReadStream(this.id, this.metadata, options)
    return this._processStreamResult(result)
  }

  /**
   * Obtain a write stream for this item.
   *
   * @param {object} options Middleware options.
   * @returns {Promise<object>} A Promise that resolves to a Writable Stream.
   */
  async getWritable (options) {
    const result = await this._ioManager.createWriteStream(this.id, this.metadata, options)
    return this._processStreamResult(result)
  }

  /**
   * Save this item's current metadata.
   *
   * This must be called for the metadata to persist after modifications have been
   * made. Note that the metadata may also be saved on other occurrences (e.g.
   * when modified by middleware), but that is not guaranteed.
   *
   * @returns {Promise} A Promise that resolves when done.
   */
  async saveMetadata () {
    await this._ioManager.writeMetadata(this.id, this.metadata)
  }
}

module.exports = Item
