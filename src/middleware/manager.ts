import { Readable, Stream, Writable } from 'node:stream'
import { MiddlewareTransformable, TransformResult } from './transformable.js'
import { Middleware, MiddlewareResult, MiddlewareTransformFn } from './middleware.js'

type TransformAccessor<S extends Stream> = (mw: Middleware) => undefined | MiddlewareTransformFn<S>

/**
 * Invoke the specified middleware function with the given parameters.
 *
 * @param middleware The middleware object.
 * @param fnAccessor A function used to obtain the transform function from a given middleware.
 * @param stream The stream to pass to the middleware.
 * @param meta The metadata to pass to the middleware.
 * @param options The options to pass to the middleware.
 * @returns Resolves to the middleware return value.
 */
async function invokeMiddleware<S extends Stream> (middleware: Middleware, fnAccessor: TransformAccessor<S>, stream: S, meta: object, options?: object): Promise<MiddlewareResult<S> | undefined> {
  const func = fnAccessor(middleware)
  if (typeof func !== 'function') {
    return
  }
  return await new Promise((resolve, reject) => {
    func.call(middleware, stream, meta, options, (err, result) => {
      if (err != null) reject(err)
      else resolve(result)
    })
  })
}

/**
 * Manager for middlewares.
 */
export class MiddlewareManager {
  private readonly middlewares: Middleware[]

  constructor () {
    this.middlewares = []
  }

  /**
   * Register a new middleware.
   *
   * @param middleware The middleware.
   */
  register (middleware: Middleware): void {
    this.middlewares.push(middleware)
  }

  /**
   * Transform the given stream and metadata by applying every middleware's
   * 'transformReadable' function.
   *
   * The result is an object with the keys 'stream', 'metadata' and
   * 'metadataChanged'. The first two are the respective transformation results,
   * while the third indicates whether the metadata was touched at all (to help
   * with optimizations).
   *
   * @param stream The base Readable Stream.
   * @param meta The item metadata.
   * @param options The user-provided options object.
   * @returns A Promise that resolves to a transformation result.
   */
  async transformReadable (stream: Readable, meta: object, options?: object): Promise<TransformResult<Readable>> {
    return await this._transform((mw) => mw.transformReadable, stream, meta, options)
  }

  /**
   * Transform the given stream and metadata by applying every middleware's
   * 'transformWritable' function.
   *
   * The result is an object with the keys 'stream', 'metadata' and
   * 'metadataChanged'. The first two are the respective transformation results,
   * while the third indicates whether the metadata was touched at all (to help
   * with optimizations).
   *
   * @param stream The base Writable Stream.
   * @param meta The item metadata.
   * @param options The user-provided options object.
   * @returns A Promise that resolves to a transformation result.
   */
  async transformWritable (stream: Writable, meta: object, options?: object): Promise<TransformResult<Writable>> {
    return await this._transform((mw) => mw.transformWritable, stream, meta, options)
  }

  private async _transform<S extends Stream> (fnAccessor: TransformAccessor<S>, stream: S, meta: object, options?: object): Promise<TransformResult<S>> {
    const obj = new MiddlewareTransformable(stream, meta)

    // sequentially update inputs with each middleware
    for (const mw of this.middlewares) {
      const result = await invokeMiddleware(mw, fnAccessor, obj.stream, obj.metadata, options)
      obj.update(result)
    }

    // return the transformed result
    return obj
  }
}
