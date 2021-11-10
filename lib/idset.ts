/**
 * A set of string ids, which can be lazy-loaded and iterated over.
 */
export class IdSet {
  private _backingSet: Set<string> | undefined
  private readonly _getBackingSet: () => Promise<Set<string>>

  /**
   * Construct a new IdSet. The load function is used to obtain the initial list
   * of ids.
   *
   * @param loadFunction A function returning or promising an array of strings, the initial ids.
   */
  constructor (loadFunction: () => readonly string[] | Promise<readonly string[]>) {
    // private method that promises the backing set on which to operate
    this._getBackingSet = async () => {
      if (this._backingSet == null) {
        this._backingSet = new Set(await loadFunction())
      }
      return this._backingSet
    }
  }

  /**
   * Add the given id to the set.
   *
   * @param id The id to add.
   * @returns A Promise that is resolved when done.
   */
  async add (id: string): Promise<void> {
    const set = await this._getBackingSet()
    set.add(id)
  }

  /**
   * Remove the given id from the set.
   *
   * @param id The id to remove.
   * @returns A Promise that is resolved when done.
   */
  async remove (id: string): Promise<void> {
    const set = await this._getBackingSet()
    set.delete(id)
  }

  /**
   * Determine whether the given id is contained in this set.
   *
   * @param id The id to check.
   * @returns A Promise for whether the id is in this set.
   */
  async includes (id: string): Promise<boolean> {
    const set = await this._getBackingSet()
    return set.has(id)
  }

  /**
   * Iterate over all ids in this set. Iteration happens sequentially. If the
   * callback returns a Promise or thenable, it is awaited before continuing with
   * the next element.
   *
   * @param callbackFn The function to execute for each set element.
   * @returns A Promise that is resolved when iteration is finished.
   */
  async each (callbackFn: (id: string) => any): Promise<void> {
    const set = await this._getBackingSet()
    for (const value of set) {
      await callbackFn(value)
    }
  }
}
