import {
  type GraphQLFieldConfig,
  type GraphQLFieldConfigArgumentMap,
  type GraphQLInputFieldConfig,
  GraphQLInputObjectType,
  type GraphQLInputType,
  type GraphQLInterfaceType,
  GraphQLList,
  GraphQLNonNull,
  type GraphQLObjectType,
  type GraphQLType,
  isInputObjectType,
  isInterfaceType,
  isListType,
  isNonNullType,
  isObjectType,
  isUnionType,
} from "graphql"
import {
  type GraphQLSilk,
  type InputSchema,
  getGraphQLType,
  isSilk,
} from "../resolver"
import { mapValue, tryIn } from "../utils"
import type { CoreSchemaWeaverConfig } from "./types"
import { provideWeaverContext, weaverContext } from "./weaver-context"

export function inputToArgs(
  input: InputSchema<GraphQLSilk>
): GraphQLFieldConfigArgumentMap | undefined {
  if (input === undefined) return undefined
  if (isSilk(input)) {
    let inputType = getGraphQLType(input)
    if (isNonNullType(inputType)) inputType = inputType.ofType
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
  silkOrType: GraphQLType | GraphQLSilk
): GraphQLInputType {
  const gqlType = (() => {
    if (isSilk(silkOrType)) {
      return getGraphQLType(silkOrType)
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
    return ensureInputObjectType(gqlType)
  return gqlType
}

export function ensureInputObjectType(
  object: GraphQLObjectType | GraphQLInterfaceType | GraphQLInputObjectType
): GraphQLInputObjectType {
  if (isInputObjectType(object)) return object

  const existing = weaverContext.inputMap?.get(object)
  if (existing != null) return existing

  const {
    astNode: _,
    extensionASTNodes: __,
    fields,
    ...config
  } = object.toConfig()

  const getInputObjectName =
    weaverContext.getConfig<CoreSchemaWeaverConfig>("gqloom.core.schema")
      ?.getInputObjectName ?? ((name) => name)

  const input = new GraphQLInputObjectType({
    ...config,
    name: getInputObjectName(object.name),
    fields: provideWeaverContext.inherit(() =>
      mapValue(fields, (it) => toInputFieldConfig(it))
    ),
  })

  weaverContext.inputMap?.set(object, input)
  return input
}

function toInputFieldConfig({
  astNode: _,
  resolve: _1,
  ...config
}: GraphQLFieldConfig<any, any>): GraphQLInputFieldConfig {
  return { ...config, type: ensureInputType(config.type) }
}
