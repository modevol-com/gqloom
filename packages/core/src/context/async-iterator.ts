import type { AsyncLocalStorage } from "node:async_hooks"

export function bindAsyncIterator<
  TAsyncLocalStorage extends AsyncLocalStorage<unknown>,
  TAsyncIterator extends AsyncIterator<unknown, unknown, unknown>,
>(storage: TAsyncLocalStorage, generator: TAsyncIterator): TAsyncIterator {
  const store = storage.getStore()
  const next = generator.next
  Object.defineProperty(generator, "next", {
    value: (...args: [unknown]) =>
      storage.run(store, () => next.apply(generator, args)),
    writable: false,
  })
  return generator as TAsyncIterator
}

export function isAsyncIterator(
  value: unknown
): value is AsyncIterator<unknown, unknown, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    "next" in value &&
    typeof value.next === "function"
  )
}
