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
  GraphQLNonNull,
  isNonNullType,
  type GraphQLFieldResolver,
  type GraphQLOutputType,
} from "graphql"
import type { FieldConvertOptions, SilkOperationOrField } from "./types"
import {
  mapValue,
  markErrorLocation,
  resolverPayloadStorage,
  toObjMap,
} from "../utils"
import {
  initWeaverContext,
  provideWeaverContext,
  weaverContext,
  type WeaverContext,
} from "./weaver-context"
import { inputToArgs } from "./input"
import { type ResolvingOptions, defaultSubscriptionResolve } from "../resolver"

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
    this.fieldOptions = fieldOptions ?? {}
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
    const { optionsForResolving } = options
    const outputType = getCacheType(field.output.getType())

    const nullableType = (() => {
      if (
        (field.nonNull ?? field.output.nonNull) &&
        !isNonNullType(outputType)
      ) {
        return new GraphQLNonNull(outputType)
      }
      return outputType
    })()

    return {
      ...field,
      type: nullableType,
      args: inputToArgs(field.input),
      ...provideForResolve(field, optionsForResolving),
      ...provideForSubscribe(field, optionsForResolving),
    }
  } catch (error) {
    markErrorLocation(error)
    throw error
  }
}

function getCacheType(gqlType: GraphQLOutputType): GraphQLOutputType {
  if (gqlType instanceof ModifiableObjectType) return gqlType
  if (isObjectType(gqlType)) {
    const gqlObject = weaverContext.modifiableObjectMap?.get(gqlType)
    if (gqlObject != null) return gqlObject
  } else if (isListType(gqlType)) {
    return new GraphQLList(getCacheType(gqlType.ofType))
  } else if (isNonNullType(gqlType)) {
    return new GraphQLNonNull(getCacheType(gqlType.ofType))
  }
  return gqlType
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
