import {
  type GraphQLFieldConfig,
  type GraphQLFieldConfigArgumentMap,
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
  type GraphQLInterfaceType,
} from "graphql"
import { type AnyGraphQLSilk, type InputSchema, isSilk } from "../resolver"
import { mapValue, tryIn } from "../utils"
import { weaverContext } from "./weaver-context"

export function inputToArgs(
  input: InputSchema<AnyGraphQLSilk>
): GraphQLFieldConfigArgumentMap | undefined {
  if (input === undefined) return undefined
  if (isSilk(input)) {
    const inputType = input.getType()
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
        type: ensureInputType(field),
      }
    }, name)
  })
  return args
}

export function ensureInputType(
  silkOrType: GraphQLType | AnyGraphQLSilk
): GraphQLInputType {
  const gqlType = (() => {
    if ("getType" in silkOrType) {
      const ofType = silkOrType.getType()

      if (silkOrType.nonNull && !isNonNullType(ofType))
        return new GraphQLNonNull(ofType)
      return ofType
    }
    return silkOrType
  })()

  if (isUnionType(gqlType))
    throw new Error(`Cannot convert union type ${gqlType.name} to input type`)
  if (isNonNullType(gqlType)) {
    return new GraphQLNonNull(ensureInputType(gqlType.ofType))
  }
  if (isListType(gqlType)) {
    return new GraphQLList(ensureInputType(gqlType.ofType))
  }
  if (isObjectType(gqlType) || isInterfaceType(gqlType))
    return toInputObjectType(gqlType)
  return gqlType
}

export function toInputObjectType(
  object: GraphQLObjectType | GraphQLInterfaceType
): GraphQLInputObjectType {
  const existing = weaverContext.inputMap?.get(object)
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

  weaverContext.inputMap?.set(object, input)
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