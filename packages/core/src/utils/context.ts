import type { ResolverPayload } from "../resolver"
import { CONTEXT_MAP_KEY } from "./symbols"

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

export function getMemoizationMap(
  payload: OnlyMemoizationPayload | ResolverPayload
) {
  if (isOnlyMemoryPayload(payload)) return payload.memoization
  if (typeof payload.context === "undefined") {
    Object.defineProperty(payload, "context", { value: {} })
  }
  return assignContextMap(payload.context)
}

interface ContextMemoryContainer {
  [CONTEXT_MAP_KEY]?: WeakMap<WeakKey, any>
}

export function assignContextMap(
  target: ContextMemoryContainer
): WeakMap<WeakKey, any> {
  target[CONTEXT_MAP_KEY] ??= new WeakMap()
  return target[CONTEXT_MAP_KEY]
}
