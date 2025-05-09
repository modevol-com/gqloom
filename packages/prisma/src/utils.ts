import { type ResolverPayload, getResolvingFields } from "@gqloom/core"
import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  type GraphQLOutputType,
  GraphQLString,
} from "graphql"
import type { PrismaModelSilk, SelectedModelFields } from "./types"

export function capitalize<T extends string>(str: T): Capitalize<T> {
  return (str.slice(0, 1).toUpperCase() + str.slice(1)) as Capitalize<T>
}

export const gqlType = {
  int: GraphQLInt,
  float: GraphQLFloat,
  id: GraphQLID,
  string: GraphQLString,
  boolean: GraphQLBoolean,
  list: (type: GraphQLOutputType) => new GraphQLList(new GraphQLNonNull(type)),
  nonNull: (type: GraphQLOutputType) => new GraphQLNonNull(type),
}

/**
 * Get the selected columns from the resolver payload
 * @param table - The table to get the selected columns from
 * @param payload - The resolver payload
 * @returns The selected columns
 */
export function getSelectedFields<
  TSilk extends PrismaModelSilk<unknown, string, Record<string, unknown>>,
>(
  silk: TSilk,
  payload: ResolverPayload | (ResolverPayload | undefined)[] | undefined
): SelectedModelFields<TSilk> {
  if (!payload) {
    return Object.fromEntries(
      silk.model.fields.map((field) => [field.name, true])
    ) as SelectedModelFields<TSilk>
  }
  let selectedFields = new Set<string>()
  if (Array.isArray(payload)) {
    for (const p of payload) {
      if (p) {
        const resolving = getResolvingFields(p)
        for (const field of resolving.selectedFields) selectedFields.add(field)
      }
    }
  } else {
    const resolving = getResolvingFields(payload)
    selectedFields = resolving.selectedFields
  }
  return Object.fromEntries(
    silk.model.fields
      .filter((field) => selectedFields.has(field.name) || field.isId)
      .map((field) => [field.name, true])
  ) as SelectedModelFields<TSilk>
}
