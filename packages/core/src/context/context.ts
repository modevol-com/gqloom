import { AsyncLocalStorage } from "node:async_hooks"
import type { ResolverPayload } from "../resolver/types"
import type { Middleware } from "../utils"
import {
  getMemoizationMap,
  isOnlyMemoryPayload,
  type OnlyMemoizationPayload,
  onlyMemoization,
} from "../utils/context"
import { bindAsyncIterator, isAsyncIterator } from "./async-iterator"

/**
 * the AsyncLocalStorage instance to store the resolver payload
 */
export const resolverPayloadStorage = new AsyncLocalStorage<
  ResolverPayload | OnlyMemoizationPayload
>()

/**
 * use detailed payload of the current resolver
 * @returns the resolver payload
 */
export function useResolverPayload(): ResolverPayload | undefined {
  const payload = resolverPayloadStorage.getStore()
  if (payload === undefined || isOnlyMemoryPayload(payload)) return
  return payload
}

/**
 * use context of the current resolver
 * @returns the context of the current resolver
 */
export function useContext<TContextType = object>(): TContextType {
  return useResolverPayload()?.context as TContextType
}

/**
 * use the MemoizationMap of the current context
 */
export function useMemoizationMap(): WeakMap<WeakKey, any> | undefined {
  const payload = resolverPayloadStorage.getStore()
  if (payload == null) return
  return getMemoizationMap(payload)
}

interface ContextOptions {
  getContextMap: () => WeakMap<WeakKey, any> | undefined
  key: WeakKey
}

/**
 * A class that provides dependency injection and context sharing capabilities.
 * It allows you to create injectable dependencies that can be shared across different parts of your application.
 *
 * @template T The type of the value that will be injected
 *
 */
export class InjectableContext<T> implements ContextOptions {
  /**
   * Creates a new instance of InjectableContext.
   *
   * @param getter - A function that returns the default value when no custom implementation is provided
   * @param options - Optional configuration for the context
   * @param options.getContextMap - A function that returns the WeakMap used to store context values. Defaults to useMemoizationMap
   * @param options.key - A unique key used to identify this context in the WeakMap. Defaults to the getter function
   */
  public constructor(
    public readonly getter: () => T,
    options: Partial<ContextOptions> = {}
  ) {
    this.getter = getter
    this.getContextMap = options.getContextMap ?? useMemoizationMap
    this.key = options.key ?? this.getter
  }

  /**
   * A function that returns the WeakMap used to store context values.
   * This can be customized to use different storage mechanisms.
   */
  public getContextMap: () => WeakMap<WeakKey, any> | undefined

  /**
   * A unique key used to identify this context in the WeakMap.
   * This is used to store and retrieve values from the context map.
   */
  public readonly key: WeakKey

  /**
   * Retrieves the value from the context.
   * If a custom implementation is provided, it will be used.
   * Otherwise, the default getter function will be called.
   *
   * @returns The value of type T
   */
  public get(): T {
    const getter = this.getContextMap()?.get(this.key) ?? this.getter
    if (typeof getter === "function") return getter()
    return getter
  }

  /**
   * Provides a new implementation for this context.
   *
   * @param getter - A function that returns the new value
   * @returns A tuple containing the key and the new getter function
   */
  public provide(getter: () => T): [WeakKey, () => T] {
    return [this.key, getter]
  }
}

/**
 * Create a memoization in context to store the result of a getter function
 */
export class ContextMemoization<T> implements ContextOptions {
  public constructor(
    public readonly getter: () => T,
    options: Partial<ContextOptions> = {}
  ) {
    this.getter = getter
    this.getContextMap = options.getContextMap ?? useMemoizationMap
    this.key = options.key ?? this.getter
  }

  public getContextMap: () => WeakMap<WeakKey, any> | undefined
  public readonly key: WeakKey

  /**
   * Get the value in memoization or call the getter function
   * @returns the value of the getter function
   */
  public get(): T {
    const map = this.getContextMap()
    if (!map) return this.getter()

    if (!map.has(this.key)) {
      map.set(this.key, this.getter())
    }
    return map.get(this.key)
  }

  /**
   * Clear the memoization
   * @returns true if the memoization is cleared, undefined if the context is not found
   */
  public clear(): boolean | undefined {
    const map = this.getContextMap()
    if (!map) return
    return map.delete(this.key)
  }

  /**
   * Check if the memoization exists
   * @returns true if the memoization exists, undefined if the context is not found
   */
  public exists(): boolean | undefined {
    const map = this.getContextMap()
    if (!map) return
    return map.has(this.key)
  }

  /**
   * Set a new value to the memoization
   * @param value  the new value to set
   * @returns the memoization map or undefined if the context is not found
   */
  public set(value: T): WeakMap<WeakKey, any> | undefined {
    const map = this.getContextMap()
    if (!map) return
    return map.set(this.key, value)
  }

  public provide(value: T): [WeakKey, T] {
    return [this.key, value]
  }
}

export interface CallableContext<T> extends InjectableContext<T> {
  (): T
}

/**
 * Create a callable context
 * @param args - The arguments to pass to the InjectableContext constructor
 * @returns A callable context
 */
export function createContext<T>(
  ...args: ConstructorParameters<typeof InjectableContext<T>>
): CallableContext<T> {
  const context = new InjectableContext(...args)
  const callable = () => context.get()
  Object.defineProperty(context, "key", {
    value: callable,
    writable: false,
    configurable: false,
  })
  return Object.assign(callable, {
    key: context.key,
    get: () => context.get(),
    provide: (getter: () => T) => context.provide(getter),
    getContextMap: () => context.getContextMap(),
    getter: context.getter,
  })
}

/**
 * Async Memoization with a callable function
 */
export interface CallableContextMemoization<T> extends ContextMemoization<T> {
  (): T
}

/**
 * Create a memoization in context to store the result of a getter function
 */
export function createMemoization<T>(
  ...args: ConstructorParameters<typeof ContextMemoization<T>>
): CallableContextMemoization<T> {
  const memoization = new ContextMemoization(...args)
  const callable = () => memoization.get()
  Object.defineProperty(memoization, "key", {
    value: callable,
    writable: false,
    configurable: false,
  })
  return Object.assign(callable, {
    key: memoization.key,
    get: () => memoization.get(),
    set: (value: T) => memoization.set(value),
    clear: () => memoization.clear(),
    exists: () => memoization.exists(),
    getter: memoization.getter,
    provide: (value: T) => memoization.provide(value),
    getContextMap: () => memoization.getContextMap(),
  })
}

export interface AsyncContextProvider extends Middleware {
  /**
   * Creates a middleware that injects key-value pairs into the context during resolver execution.
   * The injected values will be available throughout the entire resolver execution chain.
   *
   * @param keyValues - An array of tuples containing a WeakKey and its corresponding value
   * @returns A middleware function that injects the provided key-value pairs into the context
   *
   * @example
   * ```ts
   * const executor = resolver.toExecutor(
   *   asyncContextProvider.with(
   *     useDefaultName.provide(() => "Default Name")
   *   )
   * )
   * ```
   */
  with: (...keyValues: [WeakKey, any][]) => Middleware

  /**
   * Executes an async function with injected context values.
   * The provided key-value pairs will be available in the context during the function execution.
   *
   * @template T - The return type of the async function
   * @param resolve - The async function to execute
   * @param keyValues - An array of tuples containing a WeakKey and its corresponding value
   * @returns A Promise that resolves to the result of the async function
   *
   * @example
   * ```ts
   * const result = await asyncContextProvider.run(
   *   async () => {
   *     const name = useDefaultName()
   *     return `Hello, ${name}!`
   *   },
   *   useDefaultName.provide(() => "John")
   * )
   * ```
   */
  run: <T>(
    resolve: () => Promise<T>,
    ...keyValues: [WeakKey, any][]
  ) => Promise<T>
}

const createProvider = (...keyValues: [WeakKey, any][]): Middleware => {
  return ({ next, payload, operation }) => {
    const store = payload ?? onlyMemoization()
    const map = getMemoizationMap(store)
    if (map) {
      for (const [key, value] of keyValues) {
        map.set(key, value)
      }
    }
    if (operation === "subscription.subscribe") {
      return resolverPayloadStorage.run(store, async () => {
        let result = await next()
        if (isAsyncIterator(result)) {
          result = bindAsyncIterator(resolverPayloadStorage, result)
        }
        return result
      })
    }
    return resolverPayloadStorage.run(store, next)
  }
}

export const asyncContextProvider: AsyncContextProvider = Object.assign(
  createProvider(),
  {
    operations: [
      "query",
      "mutation",
      "field",
      "subscription.resolve",
      "subscription.subscribe",
      "resolveReference",
    ],
    with: (...keyValues: [WeakKey, any][]) => {
      return createProvider(...keyValues)
    },
    run: async <T>(
      resolve: () => Promise<T>,
      ...keyValues: [WeakKey, any][]
    ) => {
      const store = onlyMemoization()
      const map = getMemoizationMap(store)

      for (const [key, value] of keyValues) {
        map.set(key, value)
      }

      return resolverPayloadStorage.run(store, resolve)
    },
  }
)
