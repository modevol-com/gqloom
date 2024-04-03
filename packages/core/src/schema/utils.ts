import type {
  GraphQLFieldConfig,
  GraphQLFieldConfigArgumentMap,
  GraphQLFieldResolver,
  GraphQLInputType,
  GraphQLOutputType,
} from "graphql"
import type { ResolvingOptions } from "../resolver"
import {
  type AnyGraphQLSilk,
  type InputSchema,
  isSilk,
  defaultSubscriptionResolve,
} from "../resolver"
import type { SilkOperationOrField } from "./types"
import { resolverPayloadStorage } from "../utils/context"

export function toFieldConfig(
  field: SilkOperationOrField,
  options: Record<string | number | symbol, any> = {}
): GraphQLFieldConfig<any, any> {
  return {
    ...field,
    type: field.output.getType(options),
    args: inputToArgs(field.input, options),
    ...provideForResolve(field),
    ...provideForSubscribe(field),
  }
}

function provideForResolve(
  field: SilkOperationOrField,
  options?: ResolvingOptions
): Pick<GraphQLFieldConfig<any, any>, "resolve"> | undefined {
  if (field?.resolve == null) return
  if (field.resolve === defaultSubscriptionResolve)
    return { resolve: defaultSubscriptionResolve }
  const resolve: GraphQLFieldResolver<any, any> =
    field.type === "field"
      ? (root, args, context, info) =>
          resolverPayloadStorage.run({ root, args, context, info }, () =>
            field.resolve(root, args, options)
          )
      : (root, args, context, info) =>
          resolverPayloadStorage.run({ root, args, context, info }, () =>
            field.resolve(args, options)
          )

  return { resolve }
}

function provideForSubscribe(
  field: SilkOperationOrField,
  options?: ResolvingOptions
): Pick<GraphQLFieldConfig<any, any>, "subscribe"> | undefined {
  if (field?.subscribe == null) return
  return {
    subscribe: (root, args, context, info) =>
      resolverPayloadStorage.run({ root, args, context, info }, () =>
        field.subscribe?.(args, options)
      ),
  }
}

export function inputToArgs(
  input: InputSchema<AnyGraphQLSilk>,
  options: Record<string | number | symbol, any> = {}
): GraphQLFieldConfigArgumentMap | undefined {
  if (input === undefined) return undefined
  if (isSilk(input)) return {}
  const args: GraphQLFieldConfigArgumentMap = {}
  Object.entries(input).forEach(([name, field]) => {
    args[name] = {
      ...field,
      type: ensureInputType(field.getType(options)),
    }
  })
  return args
}

// TODO
export function ensureInputType(input: GraphQLOutputType): GraphQLInputType {
  return input as GraphQLInputType
}

export function mapToFieldConfig(
  map: Map<string, SilkOperationOrField>,
  options: Record<string | number | symbol, any> = {}
): Record<string, GraphQLFieldConfig<any, any>> {
  const record: Record<string, GraphQLFieldConfig<any, any>> = {}

  for (const [name, field] of map.entries()) {
    record[name] = toFieldConfig(field, options)
  }

  return record
}
