import crypto from 'crypto'
import util from 'util'
import { Adapter, DirectoryAdapter, MemoryAdapter } from 'fs-adapters'
import { IdSet } from './idset.js'
import { IOManager } from './iomanager.js'
import { Middleware } from './middleware/middleware.js'
import { MiddlewareManager } from './middleware/manager.js'
import { Change } from './change.js'
import { Item } from './item.js'

const cryptoRandomBytes = util.promisify(crypto.randomBytes)

/**
 * @returns Resolves to the generated id.
 */
async function generateId (): Promise<string> {
  const buffer = await cryptoRandomBytes(16)
  return buffer.toString('hex')
}

/**
 * @param source The raw source.
 * @returns An adapter for the source.
 */
function resolveSource (source?: Adapter | string): Adapter {
  if (typeof source === 'string') {
    return new DirectoryAdapter(source)
  }
  return source ?? new MemoryAdapter()
}

/**
 * A GiantDB database.
 */
export class GiantDB {
  private readonly _adapter: Adapter
  private readonly _middlewareManager: MiddlewareManager
  private readonly _ioManager: IOManager
  private readonly _idSet: IdSet

  /**
   * Construct a new database. The source can either be a file system adapter or
   * a directory path. If no source is given, a volatile in-memory store is used.
   *
   * @param source An adapter or directory path.
   */
  constructor (source?: Adapter | string) {
    this._adapter = resolveSource(source)
    this._middlewareManager = new MiddlewareManager()
    this._ioManager = new IOManager(this._adapter, this._middlewareManager)

    this._idSet = new IdSet(async () => {
      const files: string[] = await this._adapter.listFiles()
      return files.filter(fileName => {
        // ignore non-committed files
        return !fileName.includes('.tmp') && !fileName.includes('.json')
      })
    })
  }

  private async _commit (id: string): Promise<Item> {
    // rename the file, add its id, resolve to an Item
    await this._ioManager.publish(id)
    await this._idSet.add(id)
    return await this.get(id)
  }

  private async _destroy (id: string): Promise<void> {
    await this._ioManager.deleteTemporary(id)
  }

  /**
   * Register the given middleware.
   *
   * @param middleware The middleware object.
   */
  use (middleware: Middleware): void {
    this._middlewareManager.register(middleware)
  }

  /**
   * Prepare a new item. This constructs a new Change object that can be written
   * to and then committed, making the item available.
   *
   * @param options Middleware options.
   * @returns A Promise that resolves to a new Change object.
   */
  async create (options?: object): Promise<Change> {
    await this._adapter.init()
    const id = await generateId()

    const out = await this._ioManager.createTemporary(id, options)

    return new Change(id, out, this._commit.bind(this, id), this._destroy.bind(this, id))
  }

  /**
   * Remove an item from this database.
   *
   * @param id The item's id.
   * @returns A Promise that is resolved when removal is complete.
   */
  async remove (id: string): Promise<void> {
    await this._ioManager.delete(id)
    await this._idSet.remove(id)
  }

  /**
   * Retrieve an item in this database by id.
   *
   * @param id The item's id.
   * @returns A Promise that resolves to the item if found.
   */
  async get (id: string): Promise<Item> {
    // check for existence first
    if (!await this._idSet.includes(id)) {
      throw new Error('item does not exist: ' + id)
    }
    // obtain the metadata, then construct
    const metadata = await this._ioManager.readMetadata(id)
    return new Item(id, this._ioManager, metadata)
  }

  /**
   * Iterate over all items in this database. Iteration happens sequentially. If
   * the callback returns a Promise or thenable, it is awaited before continuing
   * with the next item.
   *
   * @param callbackFn The function to execute for each item.
   * @returns A Promise that is resolved when iteration is finished.
   */
  async each (callbackFn: (item: Item) => any): Promise<void> {
    await this._idSet.each(async (id) => {
      const item = await this.get(id)
      await callbackFn(item)
    })
  }
}
