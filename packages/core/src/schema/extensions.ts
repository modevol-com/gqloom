import {
  type GraphQLObjectTypeExtensions,
  type GraphQLFieldExtensions,
} from "graphql"
import { deepMerge } from "../utils"

export interface GQLoomExtensions {
  defaultValue?: any
  gqloom?: GQLoomExtensionAttribute
}

export interface GQLoomExtensionAttribute {
  directives?: string[]
}

export function gqloomExtensions(extension: GQLoomExtensionAttribute) {
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
    | Readonly<
        GraphQLFieldExtensions<any, any, any> | GraphQLObjectTypeExtensions
      >
    | null
    | undefined
}): GQLoomExtensionAttribute {
  return (extensions?.gqloom as GQLoomExtensionAttribute | undefined) ?? {}
}

export function mergeExtensions(
  ...extensionsList: (
    | Readonly<
        | GraphQLFieldExtensions<any, any, any>
        | GraphQLObjectTypeExtensions
        | GQLoomExtensions
      >
    | null
    | undefined
  )[]
): GraphQLFieldExtensions<any, any, any> {
  return deepMerge(...extensionsList)
}
