export type BatchLoadFn<TKey, TData> = (
  keys: TKey[]
) => Promise<(TData | Error)[]>

/**
 * GraphQL Loom built-in data loader.
 */
export abstract class LoomDataLoader<TKey, TData> {
  protected abstract batchLoad(keys: TKey[]): Promise<(TData | Error)[]>

  protected results: Map<TKey, Promise<TData>>
  protected resolvers: Map<
    TKey,
    [
      resolve: (value: TData | PromiseLike<TData>) => void,
      reject: (reason?: any) => void,
    ]
  >
  public constructor() {
    this.results = new Map()
    this.resolvers = new Map()
  }

  /**
   * Load data for a given key.
   * @param key - The key to load data for.
   * @returns A promise that resolves to the loaded data.
   */
  public load(key: TKey): Promise<TData> {
    const existing = this.results.get(key)
    if (existing) return existing

    const promise = new Promise<TData>((resolve, reject) => {
      this.resolvers.set(key, [resolve, reject])
      this.nextTickBatchLoad()
    })
    this.results.set(key, promise)
    return promise
  }

  /**
   * Clear the cache and reset the loader.
   */
  public clear(): void {
    this.results = new Map()
    this.resolvers = new Map()
  }

  protected async executeBatchLoad(): Promise<void> {
    if (this.resolvers.size === 0) return

    const resolvers = this.resolvers
    this.resolvers = new Map()
    const keys = Array.from(resolvers.keys())

    try {
      const list = await this.batchLoad(keys)
      for (let i = 0; i < list.length; i++) {
        const data = list[i]
        const [resolve, reject] = resolvers.get(keys[i]) ?? []
        if (data instanceof Error) {
          reject?.(data)
        } else {
          resolve?.(data)
        }
      }
    } catch (error) {
      for (const key of keys) {
        const reject = resolvers.get(key)?.[1]
        reject?.(error)
      }
    }
  }

  protected nextTickPromise?: Promise<void>
  protected nextTickBatchLoad(): Promise<void> {
    const load = async () => {
      try {
        while (this.resolvers.size > 0) {
          await LoomDataLoader.nextTick()
          await this.executeBatchLoad()
        }
      } finally {
        this.nextTickPromise = undefined
      }
    }
    this.nextTickPromise ??= load()
    return this.nextTickPromise
  }

  public static nextTick(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve))
  }
}

export class EasyDataLoader<TKey, TData> extends LoomDataLoader<TKey, TData> {
  protected batchLoad(keys: TKey[]): Promise<(TData | Error)[]> {
    return this.batchLoadFn(keys)
  }
  public constructor(protected readonly batchLoadFn: BatchLoadFn<TKey, TData>) {
    super()
  }
}
