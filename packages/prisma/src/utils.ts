import { type ResolverPayload, getResolvingFields } from "@gqloom/core"
import type { DMMF } from "@prisma/generator-helper"
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
 * @param silk - The silk to get the selected columns from
 * @param payload - The resolver payload
 * @returns The selected columns
 */
export function getSelectedFields<
  TSilk extends PrismaModelSilk<unknown, string, Record<string, unknown>>,
>(
  silk: TSilk,
  payload: ResolverPayload | (ResolverPayload | undefined)[] | undefined
): SelectedModelFields<TSilk> /**
 * Get the selected columns from the resolver payload
 * @param silk - The silk to get the selected columns from
 * @param payload - The resolver payload
 * @returns The selected columns
 */
export function getSelectedFields(
  model: DMMF.Model,
  payload: ResolverPayload | (ResolverPayload | undefined)[] | undefined
): Record<string, boolean>
/**
 * Get the selected columns from the resolver payload
 * @param silk - The silk to get the selected columns from
 * @param payload - The resolver payload
 * @returns The selected columns
 */
export function getSelectedFields(
  silkOrModel:
    | PrismaModelSilk<unknown, string, Record<string, unknown>>
    | DMMF.Model,
  payload: ResolverPayload | (ResolverPayload | undefined)[] | undefined
): Record<string, boolean> {
  const model = isPrismaModelSilk(silkOrModel) ? silkOrModel.model : silkOrModel
  if (!payload) {
    return Object.fromEntries(model.fields.map((field) => [field.name, true]))
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
    model.fields
      .filter((field) => selectedFields.has(field.name) || field.isId)
      .map((field) => [field.name, true])
  )
}

function isPrismaModelSilk(
  silkOrModel: unknown
): silkOrModel is PrismaModelSilk<unknown, string, Record<string, unknown>> {
  return (
    typeof silkOrModel === "object" &&
    silkOrModel != null &&
    "~standard" in silkOrModel &&
    "model" in silkOrModel
  )
}
