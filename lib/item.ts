import { IOManager } from './iomanager'
import { TransformResult } from './middleware/transformable'
import { Readable, Stream, Writable } from 'stream'

/**
 * A single database item.
 */
export class Item {
  readonly id: string
  metadata: object
  private readonly _ioManager: IOManager

  /**
   * Construct a new Item.
   *
   * @param id The item id.
   * @param ioManager The IO manager.
   * @param metadata An object containing item metadata.
   */
  constructor (id: string, ioManager: IOManager, metadata: object) {
    this.id = id
    this.metadata = metadata

    this._ioManager = ioManager
  }

  private _processStreamResult<S extends Stream> (result: TransformResult<S>): S {
    if (result.metadataChanged) {
      this.metadata = result.metadata
    }
    return result.stream
  }

  /**
   * Obtain a read stream for this item.
   *
   * @param options Middleware options.
   * @returns A Promise that resolves to a Readable Stream.
   */
  async getReadable (options?: object): Promise<Readable> {
    const result = await this._ioManager.createReadStream(this.id, this.metadata, options)
    return this._processStreamResult(result)
  }

  /**
   * Obtain a write stream for this item.
   *
   * @param options Middleware options.
   * @returns A Promise that resolves to a Writable Stream.
   */
  async getWritable (options?: object): Promise<Writable> {
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
   * @returns A Promise that resolves when done.
   */
  async saveMetadata (): Promise<void> {
    await this._ioManager.writeMetadata(this.id, this.metadata)
  }
}
