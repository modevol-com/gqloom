import type { AsyncLocalStorage } from "node:async_hooks"

export function bindAsyncGenerator<
  TAsyncLocalStorage extends AsyncLocalStorage<unknown>,
  TAsyncIterator extends AsyncIterator<unknown, unknown, unknown>,
>(storage: TAsyncLocalStorage, generator: TAsyncIterator): TAsyncIterator {
  if (isAsyncGenerator(generator)) {
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
    } as TAsyncIterator & AsyncGenerator<unknown, unknown, unknown>
  }
  return {
    next: (...args) =>
      storage.run(storage.getStore(), () =>
        generator.next.apply(generator, args)
      ),
  } as TAsyncIterator
}

function isAsyncGenerator<T, TReturn = any, TNext = undefined>(
  generator: AsyncIterator<T, TReturn, TNext>
): generator is AsyncGenerator<T, TReturn, TNext> {
  return (
    "return" in generator &&
    typeof generator.return === "function" &&
    "throw" in generator &&
    typeof generator.throw === "function"
  )
}
