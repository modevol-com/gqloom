import {
  type GraphQLArgument,
  type GraphQLFieldConfig,
  type GraphQLFieldConfigArgumentMap,
  type GraphQLFieldMap,
  type GraphQLObjectTypeConfig,
  type ThunkObjMap,
  GraphQLObjectType,
  assertName,
  isObjectType,
  resolveObjMapThunk,
  isListType,
  GraphQLList,
} from "graphql"
import type { FieldConvertOptions, SilkOperationOrField } from "./types"
import { mapValue, markErrorLocation, toObjMap } from "../utils"
import {
  initWeaverContext,
  provideWeaverContext,
  weaverContext,
  type WeaverContext,
} from "./weaver-context"
import { inputToArgs, provideForResolve, provideForSubscribe } from "./input"

export class ModifiableObjectType extends GraphQLObjectType {
  protected extraFields = new Map<string, SilkOperationOrField>()

  protected fieldOptions: FieldConvertOptions
  protected weaverContext: WeaverContext

  constructor(
    objectOrGetter:
      | string
      | GraphQLObjectType
      | GraphQLObjectTypeConfig<any, any>
      | (() => GraphQLObjectType | GraphQLObjectTypeConfig<any, any>),
    fieldOptions?: FieldConvertOptions & { weaverContext: WeaverContext }
  ) {
    const origin =
      typeof objectOrGetter === "function" ? objectOrGetter() : objectOrGetter
    if (isObjectType(origin)) {
      super(origin.toConfig())
    } else if (typeof origin === "string") {
      super({ name: origin, fields: {} })
    } else {
      super(origin)
    }
    this.fieldOptions = fieldOptions ?? {
      optionsForGetType: {},
    }
    this.weaverContext = fieldOptions?.weaverContext ?? initWeaverContext()
  }

  addField(name: string, resolver: SilkOperationOrField) {
    const existing = this.extraFields.get(name)
    if (existing && existing !== resolver) {
      throw new Error(`Field ${name} already exists in ${this.name}`)
    }
    this.extraFields.set(name, resolver)
  }

  override getFields(): GraphQLFieldMap<any, any> {
    const fields = super.getFields()
    const extraField = provideWeaverContext(
      () =>
        defineFieldMap(mapToFieldConfig(this.extraFields, this.fieldOptions)),
      this.weaverContext
    )
    return {
      ...fields,
      ...extraField,
    }
  }
}

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
        const gqlObject = weaverContext.modifiableObjectMap?.get(gqlType)
        if (gqlObject != null) return gqlObject
      } else if (isListType(gqlType) && isObjectType(gqlType.ofType)) {
        const existing = weaverContext.modifiableObjectMap?.get(gqlType.ofType)
        if (existing != null) return new GraphQLList(existing)
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

// https://github.com/graphql/graphql-js/blob/main/src/type/definition.ts#L774
function defineFieldMap(
  fields: ThunkObjMap<GraphQLFieldConfig<any, any>>
): GraphQLFieldMap<any, any> {
  const fieldMap = resolveObjMapThunk(fields)

  return mapValue(fieldMap, (fieldConfig, fieldName) => {
    const argsConfig = fieldConfig.args ?? {}
    return {
      name: assertName(fieldName),
      description: fieldConfig.description,
      type: fieldConfig.type,
      args: defineArguments(argsConfig),
      resolve: fieldConfig.resolve,
      subscribe: fieldConfig.subscribe,
      deprecationReason: fieldConfig.deprecationReason,
      extensions: toObjMap(fieldConfig.extensions),
      astNode: fieldConfig.astNode,
    }
  })
}

// https://github.com/graphql/graphql-js/blob/main/src/type/definition.ts#L795
function defineArguments(
  args: GraphQLFieldConfigArgumentMap
): ReadonlyArray<GraphQLArgument> {
  return Object.entries(args).map(([argName, argConfig]) => ({
    name: assertName(argName),
    description: argConfig.description,
    type: argConfig.type,
    defaultValue: argConfig.defaultValue,
    deprecationReason: argConfig.deprecationReason,
    extensions: toObjMap(argConfig.extensions),
    astNode: argConfig.astNode,
  }))
}
