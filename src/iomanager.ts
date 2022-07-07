import { Adapter } from 'fs-adapters'
import { MiddlewareManager } from './middleware/manager.js'
import { TransformResult } from './middleware/transformable.js'
import { Readable, Writable } from 'stream'

/**
 * Helper class for I/O operations.
 */
export class IOManager {
  private readonly _adapter: Adapter
  private readonly _middlewareManager: MiddlewareManager

  /**
   * Construct a new IOManager.
   *
   * @param adapter The IO adapter.
   * @param middlewareManager The middleware manager.
   */
  constructor (adapter: Adapter, middlewareManager: MiddlewareManager) {
    this._adapter = adapter
    this._middlewareManager = middlewareManager
  }

  /**
   * Create a read stream for the item with the given id. Since this step may
   * modify item metadata, the result is an object with the following properties:
   * 'stream' (the readable stream), 'metadata' (the new metadata), and
   * 'metadataChanged' (a boolean indicating whether the metadata was modified).
   *
   * @param id The item id.
   * @param meta The item metadata.
   * @param options Middleware options.
   * @returns A Promise resolving to a result object.
   */
  async createReadStream (id: string, meta: object, options?: object): Promise<TransformResult<Readable>> {
    const stream = this._adapter.createReadStream(id)
    const result = await this._middlewareManager.transformReadable(stream, meta, options)
    if (result.metadataChanged) {
      await this.writeMetadata(id, result.metadata)
    }
    return result
  }

  /**
   * Create a write stream for the item with the given id. Since this step may
   * modify item metadata, the result is an object with the following properties:
   * 'stream' (the writable stream), 'metadata' (the new metadata), and
   * 'metadataChanged' (a boolean indicating whether the metadata was modified).
   *
   * @param id The item id.
   * @param meta The item metadata.
   * @param options Middleware options.
   * @returns A Promise resolving to a result object.
   */
  async createWriteStream (id: string, meta: object, options?: object): Promise<TransformResult<Writable>> {
    const stream = this._adapter.createWriteStream(id)
    const result = await this._middlewareManager.transformWritable(stream, meta, options)
    if (result.metadataChanged) {
      await this.writeMetadata(id, result.metadata)
    }
    return result
  }

  /**
   * Create a temporary write stream to an item that can be published later.
   *
   * @param id The item id.
   * @param options Middleware options.
   * @returns A Promise that resolves to a Writable Stream.
   */
  async createTemporary (id: string, options?: object): Promise<Writable> {
    const stream = this._adapter.createWriteStream(id + '.tmp')
    const result = await this._middlewareManager.transformWritable(stream, {}, options)
    await this.writeMetadata(id, result.metadata)
    return result.stream
  }

  /**
   * Mark the item with the given id as non-temporary as part of the commit
   * process.
   *
   * @param id The item id.
   * @returns A Promise that resolves when done.
   */
  async publish (id: string): Promise<void> {
    await this._adapter.rename(id + '.tmp', id)
  }

  /**
   * Delete all data for the item with the given id.
   *
   * @param id The item id.
   * @returns A Promise that resolves when done.
   */
  async delete (id: string): Promise<void> {
    await Promise.all([
      this._adapter.delete(id),
      this._adapter.delete(id + '.json')
    ])
  }

  /**
   * Delete the temporary item with the given id.
   *
   * @param id The item id.
   * @returns A Promise that resolves when done.
   */
  async deleteTemporary (id: string): Promise<void> {
    await Promise.all([
      this._adapter.delete(id + '.tmp'),
      this._adapter.delete(id + '.json').catch((err) => {
        // ignore missing metadata file
        if (err.code !== 'ENOENT') {
          throw err
        }
      })
    ])
  }

  /**
   * Read the metadata object for the item with the given id.
   *
   * @param id The item's id.
   * @returns A Promise that resolves to the metadata.
   */
  async readMetadata (id: string): Promise<object> {
    const json = await this._adapter.read(id + '.json', 'utf8') as string
    return JSON.parse(json)
  }

  /**
   * Write a metadata object for the item with the given id.
   *
   * @param id The item's id.
   * @param metadata The metadata to write.
   * @returns A Promise that resolves when done.
   */
  async writeMetadata (id: string, metadata: object): Promise<void> {
    const json = JSON.stringify(metadata)
    await this._adapter.write(id + '.json', json)
  }
}
