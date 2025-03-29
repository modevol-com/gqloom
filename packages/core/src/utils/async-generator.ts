import type { AsyncLocalStorage } from "node:async_hooks"

export function bindAsyncGenerator<
  TAsyncLocalStorage extends AsyncLocalStorage<unknown>,
  TGenerator extends AsyncGenerator<unknown, unknown, unknown>,
>(storage: TAsyncLocalStorage, generator: TGenerator): TGenerator {
  return {
    next: (...args) =>
      storage.run(storage.getStore(), () =>
        generator.next.apply(generator, args)
      ),
    return: (...args) =>
      storage.run(storage.getStore(), () =>
        generator.return.apply(generator, args)
      ),
    throw: (...args) =>
      storage.run(storage.getStore(), () =>
        generator.throw.apply(generator, args)
      ),

    [Symbol.asyncIterator]() {
      return bindAsyncGenerator(storage, generator[Symbol.asyncIterator]())
    },
  } as TGenerator
}
