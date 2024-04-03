import type {
  GraphQLFieldConfig,
  GraphQLFieldConfigArgumentMap,
  GraphQLFieldResolver,
  GraphQLInputFieldConfig,
  GraphQLInputType,
  GraphQLObjectType,
  GraphQLOutputType,
} from "graphql"
import {
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLNonNull,
  isInterfaceType,
  isListType,
  isNonNullType,
  isObjectType,
  isUnionType,
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
import { mapValue } from "../utils/object"
import { LocatableError, markErrorLocation } from "../utils/error"

export function mapToFieldConfig(
  map: Map<string, SilkOperationOrField>,
  options: Record<string | number | symbol, any> = {},
  objectMap?: Map<string, GraphQLObjectType>
): Record<string, GraphQLFieldConfig<any, any>> {
  const record: Record<string, GraphQLFieldConfig<any, any>> = {}

  for (const [name, field] of map.entries()) {
    record[name] = toFieldConfig(field, options, objectMap)
  }

  return record
}

export function toFieldConfig(
  field: SilkOperationOrField,
  options: Record<string | number | symbol, any> = {},
  objectMap?: Map<string, GraphQLObjectType>
): GraphQLFieldConfig<any, any> {
  try {
    const outputType = (() => {
      const gqlType = field.output.getType(options)
      if (isObjectType(gqlType)) {
        const gqlObject = objectMap?.get(gqlType.name)
        if (gqlObject != null) return gqlObject
      }
      return gqlType
    })()
    return {
      ...field,
      type: outputType,
      args: inputToArgs(field.input, options),
      ...provideForResolve(field),
      ...provideForSubscribe(field),
    }
  } catch (error) {
    markErrorLocation(error)
    throw error
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
  if (isSilk(input)) {
    const inputType = input.getType(options)
    if (isObjectType(inputType)) {
      return mapValue(inputType.toConfig().fields, toInputFieldConfig)
    }
    throw new LocatableError(
      `Cannot convert ${inputType.toString()} to input type`
    )
  }
  const args: GraphQLFieldConfigArgumentMap = {}
  Object.entries(input).forEach(([name, field]) => {
    try {
      args[name] = {
        ...field,
        type: ensureInputType(field.getType(options)),
      }
    } catch (error) {
      markErrorLocation(error, name)
      throw error
    }
  })
  return args
}

export function ensureInputType(input: GraphQLOutputType): GraphQLInputType {
  if (isInterfaceType(input))
    throw new LocatableError("Cannot convert interface type to input type")
  if (isUnionType(input))
    throw new LocatableError("Cannot convert union type to input type")
  if (isNonNullType(input)) {
    return new GraphQLNonNull(ensureInputType(input.ofType))
  }
  if (isListType(input)) {
    return new GraphQLList(ensureInputType(input.ofType))
  }
  if (isObjectType(input)) return toInputObjectType(input)
  return input
}

export function toInputObjectType(
  object: GraphQLObjectType
): GraphQLInputObjectType {
  const {
    astNode: _,
    extensionASTNodes: __,
    fields,
    ...config
  } = object.toConfig()
  return new GraphQLInputObjectType({
    ...config,
    fields: mapValue(fields, toInputFieldConfig),
  })
}

function toInputFieldConfig({
  astNode: _,
  extensions: __,
  ...config
}: GraphQLFieldConfig<any, any>): GraphQLInputFieldConfig {
  return { ...config, type: ensureInputType(config.type) }
}
