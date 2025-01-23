export type BatchLoadFn<TKey, TData> = (
  keys: TKey[]
) => Promise<(TData | Error)[]>

export class EasyDataLoader<TKey, TData> {
  protected queue: TKey[]
  protected cache: Map<TKey, Promise<TData>>
  protected resolvers: Map<
    TKey,
    [
      resolve: (value: TData | PromiseLike<TData>) => void,
      reject: (reason?: any) => void,
    ]
  >
  constructor(protected readonly batchLoadFn: BatchLoadFn<TKey, TData>) {
    this.queue = []
    this.cache = new Map()
    this.resolvers = new Map()
  }

  public load(key: TKey): Promise<TData> {
    const existing = this.cache.get(key)
    if (existing) return existing

    const promise = new Promise<TData>((resolve, reject) => {
      this.queue.push(key)
      this.resolvers.set(key, [resolve, reject])
      this.nextTickBatchLoad()
    })
    this.cache.set(key, promise)
    return promise
  }

  public clear(): void {
    this.queue = []
    this.cache = new Map()
    this.resolvers = new Map()
  }

  public clearByKey(key: TKey): void {
    this.queue = this.queue.filter((k) => k !== key)
    this.cache.delete(key)
    this.resolvers.delete(key)
  }

  protected async executeBatchLoad(): Promise<void> {
    if (this.queue.length === 0) return

    const [keys, resolvers] = [this.queue, this.resolvers]
    this.queue = []
    this.resolvers = new Map()

    try {
      const list = await this.batchLoadFn(keys)
      for (let i = 0; i < list.length; i++) {
        const data = list[i]
        const resolve = resolvers.get(keys[i])?.[0]
        const reject = resolvers.get(keys[i])?.[1]
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
    this.nextTickPromise ??= EasyDataLoader.nextTick()
      .then(() => this.executeBatchLoad())
      .finally(() => (this.nextTickPromise = undefined))
    return this.nextTickPromise
  }

  static nextTick(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve))
  }
}
