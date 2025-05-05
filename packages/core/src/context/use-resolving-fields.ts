import { GraphQLObjectType } from "graphql"
import type { ResolverPayload } from "../resolver"
import { DERIVED_DEPENDENCIES } from "../utils/constants"
import { parseResolvingFields } from "../utils/parse-resolving-fields"
import { createMemoization, useResolverPayload } from "./context"

/**
 * Represents the state of field resolution in a GraphQL query.
 */
export interface ResolvingFields {
  /**
   * Fields explicitly requested in the GraphQL query
   */
  requestedFields: Set<string>
  /**
   * Fields that are derived from other fields (computed fields)
   */
  derivedFields: Set<string>
  /**
   * Fields that derived fields depend on
   */
  derivedDependencies: Set<string>
  /**
   * Final set of fields that need to be resolved, after processing derived fields
   */
  selectedFields: Set<string>
}

/**
 * Analyzes and processes field resolution in a GraphQL query.
 *
 * @param payload - The resolver payload containing the current field resolution context
 * @returns An object containing sets of different field types
 */
export function getResolvingFields(payload: ResolverPayload): ResolvingFields {
  const requestedFields = parseResolvingFields(payload.info)
  const derivedFields = new Set<string>()
  const derivedDependencies = new Set<string>()
  const resolvingObject = payload.info.returnType

  if (resolvingObject instanceof GraphQLObjectType) {
    const objectFields = resolvingObject.getFields()
    for (const requestedFieldName of requestedFields) {
      const field = objectFields[requestedFieldName]
      if (field) {
        const deps = field.extensions?.[DERIVED_DEPENDENCIES]
        if (deps && Array.isArray(deps) && deps.length > 0) {
          derivedFields.add(requestedFieldName)
          for (const d of deps) derivedDependencies.add(d)
        }
      }
    }
  }

  const selectedFields = new Set<string>(requestedFields)

  for (const f of derivedFields) selectedFields.delete(f)
  for (const d of derivedDependencies) selectedFields.add(d)

  return { requestedFields, derivedFields, derivedDependencies, selectedFields }
}

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
