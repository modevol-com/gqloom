import { AsyncLocalStorage } from "node:async_hooks"
import type { GraphQLResolveInfo } from "graphql"

/**
 * Detailed arguments of the current resolver
 */
export interface ResolverArgs<TContextType extends object = object> {
  /**
   * The previous object, which for a field on the root Query type is often not used.
   */
  root: any
  /**
   * The arguments provided to the field in the GraphQL query.
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

  // TODO: output fabric
  // TODO: input fabric
}

/**
 * Empty Resolver Arguments that only store the memory
 */
export interface OnlyMemoryArgs {
  memory: WeakMap<WeakKey, any>
  isMemory: true
}

/**
 * Create an empty memory arguments for the resolver
 * @returns the empty memory arguments
 */
export function onlyMemory(): OnlyMemoryArgs {
  return { memory: new WeakMap(), isMemory: true }
}

export function isOnlyMemoryArgs(
  args: ResolverArgs | OnlyMemoryArgs
): args is OnlyMemoryArgs {
  return (args as OnlyMemoryArgs).isMemory === true
}

/**
 * the AsyncLocalStorage instance to store the resolver arguments
 */
export const resolverArgsStorage = new AsyncLocalStorage<
  ResolverArgs | OnlyMemoryArgs
>()

/**
 * use detailed arguments of the current resolver
 * @returns the resolver arguments
 */
export function useResolverArgs(): ResolverArgs | undefined {
  const args = resolverArgsStorage.getStore()
  if (args === undefined || isOnlyMemoryArgs(args)) return
  return args
}

/**
 * use context of the current resolver
 * @returns the context of the current resolver
 */
export function useContext<TContextType extends object = object>():
  | TContextType
  | undefined {
  const args = useResolverArgs()
  if (!args) return
  return args.context as TContextType
}

/**
 * use the MemoryMap of the current context
 */
export function useMemoryMap(): WeakMap<WeakKey, any> | undefined {
  const args = resolverArgsStorage.getStore()
  if (args == null) return
  if (isOnlyMemoryArgs(args)) return args.memory
  return ContextMemory.assignMemoryMap(args.context)
}

/**
 * The Symbol Key to assign a WeakMap to an object
 */
export const ContextMemoryMapSymbol = Symbol("ContextMemory")

interface ContextMemoryContainer {
  [ContextMemoryMapSymbol]?: WeakMap<WeakKey, any>
}

interface ContextMemoryOptions {
  getMemoryMap: () => WeakMap<WeakKey, any> | undefined
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
  }

  getMemoryMap: () => WeakMap<WeakKey, any> | undefined

  /**
   * Get the value in memory or call the getter function
   * @returns the value of the getter function
   */
  get(): T {
    const map = this.getMemoryMap()
    if (!map) return this.getter()

    if (!map.has(this.getter)) {
      map.set(this.getter, this.getter())
    }

    return map.get(this.getter)
  }

  /**
   * Clear the memory
   * @returns true if the memory is cleared, undefined if the context is not found
   */
  clear(): boolean | undefined {
    const map = this.getMemoryMap()
    if (!map) return
    return map.delete(this.getter)
  }

  /**
   * Check if the memory exists
   * @returns true if the memory exists, undefined if the context is not found
   */
  exists(): boolean | undefined {
    const map = this.getMemoryMap()
    if (!map) return
    return map.has(this.getter)
  }

  /**
   * Set a new value to the memory
   * @param value  the new value to set
   * @returns the memory map or undefined if the context is not found
   */
  set(value: T): WeakMap<WeakKey, any> | undefined {
    const map = this.getMemoryMap()
    if (!map) return
    return map.set(this.getter, value)
  }

  static assignMemoryMap(
    target: ContextMemoryContainer
  ): WeakMap<WeakKey, any> {
    target[ContextMemoryMapSymbol] ??= new WeakMap()
    return target[ContextMemoryMapSymbol]
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
