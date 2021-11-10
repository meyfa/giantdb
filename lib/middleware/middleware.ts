import { Readable, Stream, Writable } from 'stream'

/**
 * Describes a result object as returned by a middleware transform function.
 * When either stream or metadata changed as part of the middleware function, such a result object containing the
 * new instance must be passed to the next handler.
 */
export interface MiddlewareResult<S extends Stream> {
  stream?: S
  metadata?: object
}

/**
 * Call this function to complete the middleware transform.
 */
export type MiddlewareNextFn<S extends Stream> = (err?: Error | undefined | null, result?: MiddlewareResult<S>) => void

/**
 * A transform function as part of a middleware.
 * Calling next is mandatory, otherwise processing cannot continue. If needed, pass an error as the first argument.
 * When either stream or metadata changed as part of the middleware function, a result object containing the new
 * instance must be passed to the callback.
 */
export type MiddlewareTransformFn<S extends Stream> = (stream: S, metadata: object, options: object | undefined | null, next: MiddlewareNextFn<S>) => void

/**
 * The interface for middlewares.
 */
export interface Middleware {
  transformReadable?: MiddlewareTransformFn<Readable>
  transformWritable?: MiddlewareTransformFn<Writable>
}
