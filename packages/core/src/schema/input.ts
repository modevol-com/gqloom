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
import { mapValue, pascalCase, tryIn } from "../utils"
import { LoomObjectType } from "./object"
import type { CoreSchemaWeaverConfig } from "./types"
import { provideWeaverContext, weaverContext } from "./weaver-context"

interface EnsureInputOptions {
  fieldName?: string
}

export function inputToArgs(
  input: InputSchema<GraphQLSilk>,
  options?: EnsureInputOptions
): GraphQLFieldConfigArgumentMap | undefined {
  if (input === undefined) return undefined
  if (isSilk(input)) {
    let inputType = getGraphQLType(input)
    if (isNonNullType(inputType)) inputType = inputType.ofType
    if (isObjectType(inputType)) {
      return mapValue(inputType.toConfig().fields, (it, key) => {
        let fieldName
        if (options?.fieldName) {
          fieldName = `${pascalCase(options.fieldName)}${pascalCase(key)}`
        }
        return toInputFieldConfig(it, { fieldName })
      })
    }
    throw new Error(`Cannot convert ${inputType.toString()} to input type`)
  }
  const args: GraphQLFieldConfigArgumentMap = {}
  Object.entries(input).forEach(([name, field]) => {
    tryIn(() => {
      let fieldName
      if (options?.fieldName) {
        fieldName = `${pascalCase(options.fieldName)}${pascalCase(name)}`
      }
      args[name] = {
        ...field,
        type: ensureInputType(field, { fieldName }),
      }
    }, name)
  })
  return args
}

export function ensureInputType(
  silkOrType: GraphQLType | GraphQLSilk,
  options?: EnsureInputOptions
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
    return ensureInputObjectType(gqlType, options)
  return gqlType
}

export function ensureInputObjectType(
  object: GraphQLObjectType | GraphQLInterfaceType | GraphQLInputObjectType,
  options?: EnsureInputOptions
): GraphQLInputObjectType {
  if (isInputObjectType(object)) return object

  const existing = weaverContext.inputMap?.get(object)
  if (existing != null) return existing

  const { astNode, extensionASTNodes, fields, ...config } = object.toConfig()
  let name = object.name
  if (name === LoomObjectType.AUTO_ALIASING) {
    name = `${pascalCase(options?.fieldName ?? "")}Input`
  }
  const getInputObjectName =
    weaverContext.getConfig<CoreSchemaWeaverConfig>("gqloom.core.schema")
      ?.getInputObjectName ?? ((n) => n)

  name = getInputObjectName(name)
  const input = new GraphQLInputObjectType({
    ...config,
    name,
    fields: provideWeaverContext.inherit(() =>
      mapValue(fields, (it, key) =>
        toInputFieldConfig(it, {
          fieldName: inputFieldName(name) + pascalCase(key),
        })
      )
    ),
  })

  weaverContext.inputMap?.set(object, input)
  return input
}

function toInputFieldConfig(
  { astNode, resolve, ...config }: GraphQLFieldConfig<any, any>,
  options: EnsureInputOptions | undefined
): GraphQLInputFieldConfig {
  return { ...config, type: ensureInputType(config.type, options) }
}

function inputFieldName(name: string): string {
  while (name.endsWith("Input")) {
    name = name.slice(0, -"Input".length)
  }
  return name
}
