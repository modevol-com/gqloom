import {
  type ResolvingFields,
  getResolvingFields,
} from "../utils/parse-resolving-fields"
import { createMemoization, useResolverPayload } from "./context"

/**
 * A hook that analyzes and processes field resolution in a GraphQL query.
 *
 * The hook is memoized to prevent unnecessary recalculations.
 *
 * @returns An object containing sets of different field types,
 * or undefined if no resolver payload is available
 */
export const useResolvingFields = createMemoization<
  ResolvingFields | undefined
>(() => {
  const payload = useResolverPayload()
  if (!payload) return

  return getResolvingFields(payload)
})
