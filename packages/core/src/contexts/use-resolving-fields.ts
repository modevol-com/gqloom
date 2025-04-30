import { GraphQLObjectType } from "graphql"
import { DERIVED_DEPENDENCIES } from "../resolver"
import {
  createMemoization,
  parseResolvingFields,
  useResolverPayload,
} from "../utils"

export interface ResolvingFields {
  resolvingFields: Set<string>
  derivedFields: Set<string>
  derivedDependencies: Set<string>
  selectedFields: Set<string>
}

export const useResolvingFields = createMemoization<
  ResolvingFields | undefined
>(() => {
  const payload = useResolverPayload()
  if (!payload) return

  const resolvingFields = parseResolvingFields(payload.info)
  const derivedFields = new Set<string>()
  const derivedDependencies = new Set<string>()
  const resolvingObject = payload.info.returnType

  if (resolvingObject instanceof GraphQLObjectType) {
    const objectFields = resolvingObject.getFields()
    for (const resolvingFieldName of resolvingFields) {
      const field = objectFields[resolvingFieldName]
      if (field) {
        const deps = field.extensions?.[DERIVED_DEPENDENCIES]
        if (deps && Array.isArray(deps) && deps.length > 0) {
          derivedFields.add(resolvingFieldName)
          for (const d of deps) derivedDependencies.add(d)
        }
      }
    }
  }

  const selectedFields = new Set<string>(resolvingFields)

  for (const f of derivedFields) selectedFields.delete(f)
  for (const d of derivedDependencies) selectedFields.add(d)

  return { resolvingFields, derivedFields, derivedDependencies, selectedFields }
})
