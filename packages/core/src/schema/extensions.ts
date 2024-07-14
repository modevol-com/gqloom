import {
  type GraphQLObjectTypeExtensions,
  type GraphQLFieldExtensions,
} from "graphql"
import { deepMerge } from "../utils"

export interface GQLoomExtensions {
  defaultValue?: any
  gqloom?: GQLoomExtensionAttribute
  directives?: DirectiveItem[] | DirectiveRecord
}

export interface DirectiveItem {
  name: string
  args?: Record<string, any>
}

export type DirectiveRecord = Record<string, Record<string, any>>

export interface GQLoomExtensionAttribute {
  directives?: string[]
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
