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
import type {
  FieldConvertOptions,
  InputMap,
  SilkOperationOrField,
} from "./types"
import {
  resolverPayloadStorage,
  mapValue,
  LocatableError,
  markErrorLocation,
} from "../utils"

export function mapToFieldConfig(
  map: Map<string, SilkOperationOrField>,
  options: FieldConvertOptions = {},
  resolvingOptions?: ResolvingOptions
): Record<string, GraphQLFieldConfig<any, any>> {
  const record: Record<string, GraphQLFieldConfig<any, any>> = {}

  for (const [name, field] of map.entries()) {
    record[name] = toFieldConfig(field, options, resolvingOptions)
  }

  return record
}

export function toFieldConfig(
  field: SilkOperationOrField,
  fieldOptions: FieldConvertOptions = {},
  resolvingOptions?: ResolvingOptions
): GraphQLFieldConfig<any, any> {
  try {
    const { optionsForGetType = {}, objectMap } = fieldOptions
    const outputType = (() => {
      const gqlType = field.output.getType(optionsForGetType)
      if (isObjectType(gqlType)) {
        const gqlObject = objectMap?.get(gqlType.name)
        if (gqlObject != null) return gqlObject
      }
      return gqlType
    })()
    return {
      ...field,
      type: outputType,
      args: inputToArgs(field.input, fieldOptions),
      ...provideForResolve(field, resolvingOptions),
      ...provideForSubscribe(field, resolvingOptions),
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
  options: FieldConvertOptions = {}
): GraphQLFieldConfigArgumentMap | undefined {
  if (input === undefined) return undefined
  const { optionsForGetType = {}, inputMap } = options
  if (isSilk(input)) {
    const inputType = input.getType(optionsForGetType)
    if (isObjectType(inputType)) {
      return mapValue(inputType.toConfig().fields, (it) =>
        toInputFieldConfig(it, inputMap)
      )
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
        type: ensureInputType(field.getType(optionsForGetType), inputMap),
      }
    } catch (error) {
      markErrorLocation(error, name)
      throw error
    }
  })
  return args
}

export function ensureInputType(
  output: GraphQLType,
  inputMap?: InputMap
): GraphQLInputType {
  if (isInterfaceType(output))
    throw new LocatableError(
      `Cannot convert interface type ${output.name} to input type`
    )
  if (isUnionType(output))
    throw new LocatableError(
      `Cannot convert union type ${output.name} to input type`
    )
  if (isNonNullType(output)) {
    return new GraphQLNonNull(ensureInputType(output.ofType, inputMap))
  }
  if (isListType(output)) {
    return new GraphQLList(ensureInputType(output.ofType, inputMap))
  }
  if (isObjectType(output)) return toInputObjectType(output, inputMap)
  return output
}

export function toInputObjectType(
  object: GraphQLObjectType,
  inputMap?: InputMap
): GraphQLInputObjectType {
  const existing = inputMap?.get(object.name)
  if (existing != null) {
    if (existing[0] !== object)
      throw new LocatableError(`Input Type ${object.name} already exists`)
    return existing[1]
  }

  const {
    astNode: _,
    extensionASTNodes: __,
    fields,
    ...config
  } = object.toConfig()
  const input = new GraphQLInputObjectType({
    ...config,
    fields: mapValue(fields, (it) => toInputFieldConfig(it, inputMap)),
  })

  inputMap?.set(object.name, [object, input])
  return input
}

function toInputFieldConfig(
  {
    astNode: _,
    extensions: _1,
    resolve: _2,
    ...config
  }: GraphQLFieldConfig<any, any>,
  inputMap?: InputMap
): GraphQLInputFieldConfig {
  return { ...config, type: ensureInputType(config.type, inputMap) }
}
