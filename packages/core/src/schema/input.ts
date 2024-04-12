import {
  type GraphQLFieldConfig,
  type GraphQLFieldConfigArgumentMap,
  type GraphQLFieldResolver,
  type GraphQLInputFieldConfig,
  GraphQLInputObjectType,
  type GraphQLInputType,
  GraphQLList,
  GraphQLNonNull,
  type GraphQLObjectType,
  type GraphQLType,
  isInterfaceType,
  isListType,
  isNonNullType,
  isObjectType,
  isUnionType,
} from "graphql"
import {
  type ResolvingOptions,
  type AnyGraphQLSilk,
  type InputSchema,
  isSilk,
  defaultSubscriptionResolve,
} from "../resolver"
import type { FieldConvertOptions, SilkOperationOrField } from "./types"
import {
  resolverPayloadStorage,
  mapValue,
  markErrorLocation,
  tryIn,
} from "../utils"
import { weaverScope } from "./weaver-scope"

export function mapToFieldConfig(
  map: Map<string, SilkOperationOrField>,
  options: FieldConvertOptions = {}
): Record<string, GraphQLFieldConfig<any, any>> {
  const record: Record<string, GraphQLFieldConfig<any, any>> = {}

  for (const [name, field] of map.entries()) {
    record[name] = toFieldConfig(field, options)
  }

  return record
}

export function toFieldConfig(
  field: SilkOperationOrField,
  options: FieldConvertOptions = {}
): GraphQLFieldConfig<any, any> {
  try {
    const { optionsForGetType = {}, optionsForResolving } = options
    const outputType = (() => {
      const gqlType = field.output.getType(optionsForGetType)
      if (isObjectType(gqlType)) {
        const gqlObject = weaverScope.modifiableObjectMap?.get(gqlType)
        if (gqlObject != null) return gqlObject
      }
      return gqlType
    })()
    return {
      ...field,
      type: outputType,
      args: inputToArgs(field.input, options),
      ...provideForResolve(field, optionsForResolving),
      ...provideForSubscribe(field, optionsForResolving),
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
          resolverPayloadStorage.run({ root, args, context, info, field }, () =>
            field.resolve(root, args, options)
          )
      : field.type === "subscription"
        ? (root, args, context, info) =>
            resolverPayloadStorage.run(
              { root, args, context, info, field },
              () => field.resolve(root, args)
            )
        : (root, args, context, info) =>
            resolverPayloadStorage.run(
              { root, args, context, info, field },
              () => field.resolve(args, options)
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
      resolverPayloadStorage.run({ root, args, context, info, field }, () =>
        field.subscribe?.(args, options)
      ),
  }
}

export function inputToArgs(
  input: InputSchema<AnyGraphQLSilk>,
  options: FieldConvertOptions = {}
): GraphQLFieldConfigArgumentMap | undefined {
  if (input === undefined) return undefined
  const { optionsForGetType = {} } = options
  if (isSilk(input)) {
    const inputType = input.getType(optionsForGetType)
    if (isObjectType(inputType)) {
      return mapValue(inputType.toConfig().fields, (it) =>
        toInputFieldConfig(it)
      )
    }
    throw new Error(`Cannot convert ${inputType.toString()} to input type`)
  }
  const args: GraphQLFieldConfigArgumentMap = {}
  Object.entries(input).forEach(([name, field]) => {
    tryIn(() => {
      args[name] = {
        ...field,
        type: ensureInputType(field.getType(optionsForGetType)),
      }
    }, name)
  })
  return args
}

export function ensureInputType(output: GraphQLType): GraphQLInputType {
  if (isInterfaceType(output))
    throw new Error(
      `Cannot convert interface type ${output.name} to input type`
    )
  if (isUnionType(output))
    throw new Error(`Cannot convert union type ${output.name} to input type`)
  if (isNonNullType(output)) {
    return new GraphQLNonNull(ensureInputType(output.ofType))
  }
  if (isListType(output)) {
    return new GraphQLList(ensureInputType(output.ofType))
  }
  if (isObjectType(output)) return toInputObjectType(output)
  return output
}

export function toInputObjectType(
  object: GraphQLObjectType
): GraphQLInputObjectType {
  const existing = weaverScope.inputMap?.get(object)
  if (existing != null) return existing

  const {
    astNode: _,
    extensionASTNodes: __,
    fields,
    ...config
  } = object.toConfig()
  const input = new GraphQLInputObjectType({
    ...config,
    fields: mapValue(fields, (it) => toInputFieldConfig(it)),
  })

  weaverScope.inputMap?.set(object, input)
  return input
}

function toInputFieldConfig({
  astNode: _,
  extensions: _1,
  resolve: _2,
  ...config
}: GraphQLFieldConfig<any, any>): GraphQLInputFieldConfig {
  return { ...config, type: ensureInputType(config.type) }
}
