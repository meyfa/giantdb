'use strict'

/**
 * Represents a triple (stream, metadata, metadataChanged) that can be updated
 * with middleware results.
 */
class MiddlewareTransformable {
  constructor (stream, metadata) {
    this.stream = stream
    this.metadata = metadata
    this.metadataChanged = false
  }

  /**
   * Update this object with the results from a middleware.
   *
   * If the results contain a reference to metadata, the metadataChanged
   * attribute will be set to true.
   *
   * @param {?object} result The results.
   * @returns {void}
   */
  update (result) {
    if (!result) {
      return
    }
    this.stream = result.stream || this.stream
    if (result.metadata) {
      this.metadata = result.metadata
      this.metadataChanged = true
    }
  }
}

module.exports = MiddlewareTransformable
