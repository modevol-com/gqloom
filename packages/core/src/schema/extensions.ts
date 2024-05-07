import { type GraphQLFieldExtensions } from "graphql"
import { deepMerge } from "../utils"

export interface GQLoomExtensions {
  gqloom?: GQLoomExtension
}

export interface GQLoomExtension {
  directives?: string[]
  defaultValue?: any
}

export function gqloomExtensions(extension: GQLoomExtension) {
  return { gqloom: extension }
}

export function directives(...directives: string[]) {
  if (!directives.length) return undefined
  return gqloomExtensions({ directives })
}

export function extractGqloomExtension({
  extensions,
}: {
  extensions?:
    | Readonly<GraphQLFieldExtensions<any, any, any>>
    | null
    | undefined
}): GQLoomExtension {
  return (extensions?.gqloom as GQLoomExtension | undefined) ?? {}
}

export function mergeExtensions(
  ...extensionsList: (
    | Readonly<GraphQLFieldExtensions<any, any, any>>
    | null
    | undefined
  )[]
): GraphQLFieldExtensions<any, any, any> {
  return deepMerge(...extensionsList)
}
