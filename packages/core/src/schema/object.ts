import {
  type GraphQLArgument,
  type GraphQLFieldConfig,
  type GraphQLFieldConfigArgumentMap,
  type GraphQLFieldMap,
  type GraphQLInputObjectType,
  type GraphQLObjectTypeConfig,
  type ThunkObjMap,
  GraphQLObjectType,
  assertName,
  isObjectType,
  resolveObjMapThunk,
} from "graphql"
import type { FieldConvertOptions, SilkOperationOrField } from "./types"
import { mapToFieldConfig, toInputObjectType } from "./utils"
import { mapValue, toObjMap } from "../utils"

export class ModifiableObjectType extends GraphQLObjectType {
  protected extraFields = new Map<string, SilkOperationOrField>()

  protected fieldOptions: FieldConvertOptions

  constructor(
    objectOrGetter:
      | string
      | GraphQLObjectType
      | GraphQLObjectTypeConfig<any, any>
      | (() => GraphQLObjectType | GraphQLObjectTypeConfig<any, any>),
    fieldOptions?: FieldConvertOptions
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
      inputMap: new Map(),
      objectMap: new Map(),
    }
  }

  addField(name: string, resolver: SilkOperationOrField) {
    const existing = this.extraFields.get(name)
    if (existing && existing !== resolver) {
      throw new Error(`Field ${name} already exists`)
    }
    this.extraFields.set(name, resolver)
  }

  override getFields(): GraphQLFieldMap<any, any> {
    const fields = super.getFields()
    const extraField = defineFieldMap(
      mapToFieldConfig(this.extraFields, this.fieldOptions)
    )
    return {
      ...fields,
      ...extraField,
    }
  }

  toGraphQLInputObjectType(): GraphQLInputObjectType {
    return toInputObjectType(this, this.fieldOptions.inputMap)
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
