import { AsyncLocalStorage } from "async_hooks"
import type { GraphQLResolveInfo } from "graphql"
import type { Loom } from "../resolver/types"
import { CONTEXT_MEMORY_MAP_KEY } from "./symbols"

/**
 * Detailed payload of the current resolver
 */
export interface ResolverPayload<
  TContext extends object = object,
  TField extends Loom.BaseField = Loom.BaseField,
> {
  /**
   * The previous object, which for a field on the root Query type is often not used.
   */
  readonly root: any
  /**
   * The arguments provided to the field in the GraphQL query.
   */
  readonly args: Record<string, any>
  /**
   * The resolved value of the field, or an error.
   */
  readonly context: TContext
  /**
   * A custom object each resolver can read from/write to.
   */
  readonly info: GraphQLResolveInfo

  /**
   * The field that is being resolved.
   */
  readonly field: TField
}

/**
 * Empty Resolver Arguments that only store the memoization
 */
export interface OnlyMemoizationPayload {
  memoization: WeakMap<WeakKey, any>
  isMemoization: true
}

/**
 * Create an empty memoization payload for the resolver
 * @returns the empty memoization payload
 */
export function onlyMemoization(): OnlyMemoizationPayload {
  return { memoization: new WeakMap(), isMemoization: true }
}

export function isOnlyMemoryPayload(
  payload: ResolverPayload | OnlyMemoizationPayload
): payload is OnlyMemoizationPayload {
  return (payload as OnlyMemoizationPayload).isMemoization === true
}

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
  if (isOnlyMemoryPayload(payload)) return payload.memoization
  return ContextMemoization.assignMemoizationMap(payload.context)
}

interface ContextMemoryContainer {
  [CONTEXT_MEMORY_MAP_KEY]?: WeakMap<WeakKey, any>
}

interface ContextMemoryOptions {
  getMemoizationMap: () => WeakMap<WeakKey, any> | undefined
  key: WeakKey
}

/**
 * Create a memoization in context to store the result of a getter function
 */
export class ContextMemoization<T> implements ContextMemoryOptions {
  public constructor(
    public readonly getter: () => T,
    options: Partial<ContextMemoryOptions> = {}
  ) {
    this.getter = getter
    this.getMemoizationMap = options.getMemoizationMap ?? useMemoizationMap
    this.key = options.key ?? this.getter
  }

  public getMemoizationMap: () => WeakMap<WeakKey, any> | undefined
  public readonly key: WeakKey

  /**
   * Get the value in memoization or call the getter function
   * @returns the value of the getter function
   */
  public get(): T {
    const map = this.getMemoizationMap()
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
    const map = this.getMemoizationMap()
    if (!map) return
    return map.delete(this.key)
  }

  /**
   * Check if the memoization exists
   * @returns true if the memoization exists, undefined if the context is not found
   */
  public exists(): boolean | undefined {
    const map = this.getMemoizationMap()
    if (!map) return
    return map.has(this.key)
  }

  /**
   * Set a new value to the memoization
   * @param value  the new value to set
   * @returns the memoization map or undefined if the context is not found
   */
  public set(value: T): WeakMap<WeakKey, any> | undefined {
    const map = this.getMemoizationMap()
    if (!map) return
    return map.set(this.key, value)
  }

  public static assignMemoizationMap(
    target: ContextMemoryContainer
  ): WeakMap<WeakKey, any> {
    target[CONTEXT_MEMORY_MAP_KEY] ??= new WeakMap()
    return target[CONTEXT_MEMORY_MAP_KEY]
  }
}

/**
 * Async Memoization with a callable function
 */
export interface CallableContextMemoization<T>
  extends Pick<
    ContextMemoization<T>,
    "get" | "set" | "clear" | "exists" | "getter"
  > {
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
  return Object.assign(callable, {
    get: () => memoization.get(),
    set: (value: T) => memoization.set(value),
    clear: () => memoization.clear(),
    exists: () => memoization.exists(),
    getter: memoization.getter,
  } as Pick<
    ContextMemoization<T>,
    "get" | "set" | "clear" | "exists" | "getter"
  >)
}
