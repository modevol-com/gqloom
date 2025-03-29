import type { AsyncLocalStorage } from "node:async_hooks"

export function bindAsyncGenerator<
  TAsyncLocalStorage extends AsyncLocalStorage<unknown>,
  T = unknown,
  TReturn = any,
  TNext = unknown,
>(
  storage: TAsyncLocalStorage,
  generator: AsyncGenerator<T, TReturn, TNext>
): AsyncGenerator<T, TReturn, TNext> {
  return {
    next: storage.run(storage.getStore(), () => generator.next.bind(generator)),
    return: storage.run(storage.getStore(), () =>
      generator.return.bind(generator)
    ),
    throw: storage.run(storage.getStore(), () =>
      generator.throw.bind(generator)
    ),

    [Symbol.asyncIterator]() {
      return bindAsyncGenerator(storage, generator[Symbol.asyncIterator]())
    },
  }
}
