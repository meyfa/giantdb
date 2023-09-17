import WritableWrapper from 'writable-wrapper'
import { Writable } from 'node:stream'
import { Item } from './item.js'

/**
 * An object representing a change on an item, still to be committed.
 */
export class Change extends WritableWrapper {
  readonly id: string
  private _committer: (() => Promise<Item>) | undefined
  private _destroyer: (() => void | PromiseLike<void>) | undefined
  private _changeFinished: boolean

  /**
   * Constructs a new Change.
   *
   * @param id The ID of the new item.
   * @param writeStream The output stream to write to.
   * @param committer The function used for committing.
   * @param destroyer The function used for destruction.
   */
  constructor (id: string, writeStream: Writable, committer: () => Promise<Item>, destroyer?: () => any) {
    super(writeStream)

    this.id = id

    this._changeFinished = false
    this._committer = committer
    this._destroyer = destroyer

    this.on('error', () => {
      if (this._destroyer != null) {
        void this._destroyer()
        this._committer = undefined
        this._destroyer = undefined
      }
    })

    this.on('finish', () => {
      this._changeFinished = true
    })
  }

  /**
   * Commit this change. This ends the output and makes the item available.
   *
   * @returns A Promise that resolves to an Item, or rejects on error.
   */
  async commit (): Promise<Item> {
    if (this._committer == null) {
      throw new Error('invalid state')
    }

    const committer = this._committer
    const destroyer = this._destroyer
    this._committer = undefined
    this._destroyer = undefined

    try {
      await this._finalizeBeforeCommit()
    } catch (err) {
      if (destroyer != null) {
        await destroyer()
      }
      throw err
    }

    return await committer()
  }

  private async _finalizeBeforeCommit (): Promise<void> {
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
