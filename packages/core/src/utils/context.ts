import { AsyncLocalStorage } from "node:async_hooks"
import type { GraphQLResolveInfo } from "graphql"

/**
 * Detailed payload of the current resolver
 */
export interface ResolverPayload<TContextType extends object = object> {
  /**
   * The previous object, which for a field on the root Query type is often not used.
   */
  root: any
  /**
   * The payload provided to the field in the GraphQL query.
   */
  args: Record<string, any>
  /**
   * The resolved value of the field, or an error.
   */
  context: TContextType
  /**
   * The source object that contains the field in the parent type.
   */
  info: GraphQLResolveInfo

  // TODO: output silk
  // TODO: input silk
}

/**
 * Empty Resolver Arguments that only store the memory
 */
export interface OnlyMemoryPayload {
  memory: WeakMap<WeakKey, any>
  isMemory: true
}

/**
 * Create an empty memory payload for the resolver
 * @returns the empty memory payload
 */
export function onlyMemory(): OnlyMemoryPayload {
  return { memory: new WeakMap(), isMemory: true }
}

export function isOnlyMemoryPayload(
  args: ResolverPayload | OnlyMemoryPayload
): args is OnlyMemoryPayload {
  return (args as OnlyMemoryPayload).isMemory === true
}

/**
 * the AsyncLocalStorage instance to store the resolver payload
 */
export const resolverPayloadStorage = new AsyncLocalStorage<
  ResolverPayload | OnlyMemoryPayload
>()

/**
 * use detailed payload of the current resolver
 * @returns the resolver payload
 */
export function useResolverPayload(): ResolverPayload | undefined {
  const args = resolverPayloadStorage.getStore()
  if (args === undefined || isOnlyMemoryPayload(args)) return
  return args
}

/**
 * use context of the current resolver
 * @returns the context of the current resolver
 */
export function useContext<TContextType extends object = object>():
  | TContextType
  | undefined {
  const args = useResolverPayload()
  if (!args) return
  return args.context as TContextType
}

/**
 * use the MemoryMap of the current context
 */
export function useMemoryMap(): WeakMap<WeakKey, any> | undefined {
  const args = resolverPayloadStorage.getStore()
  if (args == null) return
  if (isOnlyMemoryPayload(args)) return args.memory
  return ContextMemory.assignMemoryMap(args.context)
}

/**
 * The Symbol Key to assign a WeakMap to an object
 */
export const CONTEXT_MEMORY_MAP_KEY = Symbol("ContextMemory")

interface ContextMemoryContainer {
  [CONTEXT_MEMORY_MAP_KEY]?: WeakMap<WeakKey, any>
}

interface ContextMemoryOptions {
  getMemoryMap: () => WeakMap<WeakKey, any> | undefined
  key: WeakKey
}

/**
 * Create a memory in context to store the result of a getter function
 */
export class ContextMemory<T> implements ContextMemoryOptions {
  constructor(
    readonly getter: () => T,
    options: Partial<ContextMemoryOptions> = {}
  ) {
    this.getter = getter
    this.getMemoryMap = options.getMemoryMap ?? useMemoryMap
    this.key = options.key ?? this.getter
  }

  getMemoryMap: () => WeakMap<WeakKey, any> | undefined
  readonly key: WeakKey

  /**
   * Get the value in memory or call the getter function
   * @returns the value of the getter function
   */
  get(): T {
    const map = this.getMemoryMap()
    if (!map) return this.getter()

    if (!map.has(this.key)) {
      map.set(this.key, this.getter())
    }

    return map.get(this.key)
  }

  /**
   * Clear the memory
   * @returns true if the memory is cleared, undefined if the context is not found
   */
  clear(): boolean | undefined {
    const map = this.getMemoryMap()
    if (!map) return
    return map.delete(this.key)
  }

  /**
   * Check if the memory exists
   * @returns true if the memory exists, undefined if the context is not found
   */
  exists(): boolean | undefined {
    const map = this.getMemoryMap()
    if (!map) return
    return map.has(this.key)
  }

  /**
   * Set a new value to the memory
   * @param value  the new value to set
   * @returns the memory map or undefined if the context is not found
   */
  set(value: T): WeakMap<WeakKey, any> | undefined {
    const map = this.getMemoryMap()
    if (!map) return
    return map.set(this.key, value)
  }

  static assignMemoryMap(
    target: ContextMemoryContainer
  ): WeakMap<WeakKey, any> {
    target[CONTEXT_MEMORY_MAP_KEY] ??= new WeakMap()
    return target[CONTEXT_MEMORY_MAP_KEY]
  }
}

/**
 * Async Memory with a callable function
 */
export interface CallableContextMemory<T>
  extends Pick<
    ContextMemory<T>,
    "get" | "set" | "clear" | "exists" | "getter"
  > {
  (): T
}

/**
 * Create a Memory in context to store the result of a getter function
 */
export function createMemory<T>(
  ...args: ConstructorParameters<typeof ContextMemory<T>>
): CallableContextMemory<T> {
  const memory = new ContextMemory(...args)
  const callable = () => memory.get()
  return Object.assign(callable, {
    get: () => memory.get(),
    set: (value: T) => memory.set(value),
    clear: () => memory.clear(),
    exists: () => memory.exists(),
    getter: memory.getter,
  } as Pick<ContextMemory<T>, "get" | "set" | "clear" | "exists" | "getter">)
}
