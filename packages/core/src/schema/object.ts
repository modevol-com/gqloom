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
  isUnionType,
  GraphQLUnionType,
} from "graphql"
import type { SilkFieldOrOperation } from "./types"
import {
  mapValue,
  markErrorLocation,
  resolverPayloadStorage,
  toObjMap,
} from "../utils"
import {
  initWeaverContext,
  provideWeaverContext,
  type WeaverContext,
} from "./weaver-context"
import { inputToArgs } from "./input"
import {
  type ResolvingOptions,
  defaultSubscriptionResolve,
  getGraphQLType,
} from "../resolver"
export class LoomObjectType extends GraphQLObjectType {
  public extraFields = new Map<string, SilkFieldOrOperation>()

  public weaverContext: WeaverContext
  public resolverOptions?: ResolvingOptions

  constructor(
    objectOrGetter:
      | string
      | GraphQLObjectType
      | GraphQLObjectTypeConfig<any, any>
      | (() => GraphQLObjectType | GraphQLObjectTypeConfig<any, any>),
    options: {
      weaverContext?: WeaverContext
      resolverOptions?: ResolvingOptions
    } = {}
  ) {
    const origin =
      typeof objectOrGetter === "function" ? objectOrGetter() : objectOrGetter

    const config: GraphQLObjectTypeConfig<any, any> = (() => {
      if (isObjectType(origin)) {
        return origin.toConfig()
      } else if (typeof origin === "string") {
        return { name: origin, fields: {} }
      } else {
        return origin
      }
    })()

    super(config)

    this.resolverOptions = options.resolverOptions
    this.weaverContext = options.weaverContext ?? initWeaverContext()
  }

  addField(name: string, resolver: SilkFieldOrOperation) {
    const existing = this.extraFields.get(name)
    if (existing && existing !== resolver) {
      throw new Error(`Field ${name} already exists in ${this.name}`)
    }
    this.extraFields.set(name, resolver)
  }

  private extraField?: GraphQLFieldMap<any, any>
  override getFields(): GraphQLFieldMap<any, any> {
    const fields = super.getFields()

    Object.values(fields).forEach(
      (field) => (field.type = this.getCacheType(field.type))
    )

    const extraField = provideWeaverContext(
      () => defineFieldMap(this.mapToFieldConfig(this.extraFields)),
      this.weaverContext
    )

    if (
      Object.keys(this.extraField ?? {}).join() !==
      Object.keys(extraField).join()
    ) {
      this.extraField = extraField
    }

    return {
      ...fields,
      ...this.extraField,
    }
  }

  protected mapToFieldConfig(
    map: Map<string, SilkFieldOrOperation>
  ): Record<string, GraphQLFieldConfig<any, any>> {
    const record: Record<string, GraphQLFieldConfig<any, any>> = {}

    for (const [name, field] of map.entries()) {
      record[name] = this.toFieldConfig(field)
    }

    return record
  }

  toFieldConfig(field: SilkFieldOrOperation): GraphQLFieldConfig<any, any> {
    try {
      const outputType = this.getCacheType(getGraphQLType(field.output))

      return {
        ...extract(field),
        type: outputType,
        args: inputToArgs(field.input),
        ...this.provideForResolve(field),
        ...this.provideForSubscribe(field),
      }
    } catch (error) {
      throw markErrorLocation(error)
    }
  }

  protected provideForResolve(
    field: SilkFieldOrOperation
  ): Pick<GraphQLFieldConfig<any, any>, "resolve"> | undefined {
    if (field?.resolve == null) return
    if (field.resolve === defaultSubscriptionResolve)
      return { resolve: defaultSubscriptionResolve }
    const resolve: GraphQLFieldResolver<any, any> =
      field.type === "field"
        ? (root, args, context, info) =>
            resolverPayloadStorage.run(
              { root, args, context, info, field },
              () => field.resolve(root, args, this.resolverOptions)
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
                () => field.resolve(args, this.resolverOptions)
              )

    return { resolve }
  }

  protected provideForSubscribe(
    field: SilkFieldOrOperation
  ): Pick<GraphQLFieldConfig<any, any>, "subscribe"> | undefined {
    if (field?.subscribe == null) return
    return {
      subscribe: (root, args, context, info) =>
        resolverPayloadStorage.run({ root, args, context, info, field }, () =>
          field.subscribe?.(args, this.resolverOptions)
        ),
    }
  }

  protected getCacheType(gqlType: GraphQLOutputType): GraphQLOutputType {
    if (gqlType instanceof LoomObjectType) return gqlType
    if (isObjectType(gqlType)) {
      const gqlObject = this.weaverContext.loomObjectMap.get(gqlType)
      if (gqlObject != null) return gqlObject

      const loomObject = new LoomObjectType(gqlType, this.options)
      this.weaverContext.loomObjectMap.set(gqlType, loomObject)
      return loomObject
    } else if (isListType(gqlType)) {
      return new GraphQLList(this.getCacheType(gqlType.ofType))
    } else if (isNonNullType(gqlType)) {
      return new GraphQLNonNull(this.getCacheType(gqlType.ofType))
    } else if (isUnionType(gqlType)) {
      const existing = this.weaverContext.loomUnionMap.get(gqlType)
      if (existing != null) return existing
      const config = gqlType.toConfig()
      const unionType = new GraphQLUnionType({
        ...config,
        types: config.types.map(
          (type) => this.getCacheType(type) as GraphQLObjectType
        ),
      })
      this.weaverContext.loomUnionMap.set(gqlType, unionType)
      return unionType
    }
    return gqlType
  }

  get options() {
    const { resolverOptions, weaverContext } = this
    return { resolverOptions, weaverContext }
  }
}

function extract({
  deprecationReason,
  description,
  extensions,
}: SilkFieldOrOperation): Partial<GraphQLFieldConfig<any, any>> {
  return {
    description,
    deprecationReason,
    extensions,
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
