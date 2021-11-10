import { Stream } from 'stream'
import { MiddlewareResult } from './middleware'

/**
 * Represents a triple (stream, metadata, metadataChanged) containing the results of middleware evaluation.
 */
export interface TransformResult<S extends Stream> {
  readonly stream: S
  readonly metadata: object
  readonly metadataChanged: boolean
}

/**
 * Represents a triple (stream, metadata, metadataChanged) that can be updated
 * with middleware results.
 */
export class MiddlewareTransformable<S extends Stream> implements TransformResult<S> {
  stream: S
  metadata: object
  metadataChanged: boolean

  constructor (stream: S, metadata: object) {
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
   * @param result The results.
   */
  update (result?: MiddlewareResult<S>): void {
    if (result == null) {
      return
    }
    this.stream = result.stream ?? this.stream
    if (result.metadata != null) {
      this.metadata = result.metadata
      this.metadataChanged = true
    }
  }
}
