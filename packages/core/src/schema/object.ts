import {
  type GraphQLArgument,
  type GraphQLFieldConfig,
  type GraphQLFieldConfigArgumentMap,
  type GraphQLFieldMap,
  type GraphQLFieldResolver,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  type GraphQLObjectTypeConfig,
  type GraphQLOutputType,
  GraphQLUnionType,
  type ThunkObjMap,
  assertName,
  isListType,
  isNonNullType,
  isObjectType,
  isUnionType,
  resolveObjMapThunk,
} from "graphql"
import { bindAsyncIterator } from "../contexts/async-iterator"
import {
  type Loom,
  type ResolvingOptions,
  defaultSubscriptionResolve,
  getGraphQLType,
} from "../resolver"
import {
  deepMerge,
  mapValue,
  markErrorLocation,
  pascalCase,
  resolverPayloadStorage,
  toObjMap,
} from "../utils"
import { inputToArgs } from "./input"
import {
  type WeaverContext,
  initWeaverContext,
  provideWeaverContext,
  weaverContext,
} from "./weaver-context"

export class LoomObjectType extends GraphQLObjectType {
  protected extraFields = new Map<string, Loom.BaseField>()
  protected hiddenFields = new Set<string>()

  public static AUTO_ALIASING = "__gqloom_auto_aliasing" as const

  protected weaverContext: WeaverContext
  protected resolverOptions?: ResolvingOptions

  public constructor(
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

    if (this.name !== LoomObjectType.AUTO_ALIASING) {
      this.hasExplicitName = true
    }
  }

  protected hasExplicitName?: boolean
  protected _aliases: string[] = []
  public get aliases(): string[] {
    return this._aliases
  }

  public addAlias(name: string) {
    if (this.hasExplicitName) return
    this._aliases.push(name)
    this.renameByAliases()
  }

  protected renameByAliases() {
    let name: string | undefined
    for (const alias of this.aliases) {
      if (name === undefined || alias.length < name.length) {
        name = alias
      }
    }
    if (name) this.name = name
  }

  public hideField(name: string) {
    this.hiddenFields.add(name)
  }

  public addField(name: string, resolver: Loom.BaseField) {
    const existing = this.extraFields.get(name)
    if (existing && existing !== resolver) {
      throw new Error(`Field ${name} already exists in ${this.name}`)
    }
    this.extraFields.set(name, resolver)
  }

  public mergeExtensions(
    extensions: GraphQLObjectTypeConfig<any, any>["extensions"]
  ) {
    this.extensions = deepMerge(this.extensions, extensions)
  }

  private extraFieldMap?: GraphQLFieldMap<any, any>
  public override getFields(): GraphQLFieldMap<any, any> {
    const fieldsBySuper = super.getFields()

    Object.entries(fieldsBySuper).forEach(
      ([fieldName, field]) =>
        (field.type = this.getCacheType(field.type, fieldName))
    )

    const extraFields = provideWeaverContext(
      () => defineFieldMap(this.mapToFieldConfig(this.extraFields)),
      this.weaverContext
    )

    if (
      Object.keys(this.extraFieldMap ?? {}).join() !==
      Object.keys(extraFields).join()
    ) {
      this.extraFieldMap = extraFields
    }

    const answer = {
      ...fieldsBySuper,
      ...this.extraFieldMap,
    }
    for (const fieldName of this.hiddenFields) {
      delete answer[fieldName]
    }
    return answer
  }

  protected mapToFieldConfig(
    map: Map<string, Loom.BaseField>
  ): Record<string, GraphQLFieldConfig<any, any>> {
    const record: Record<string, GraphQLFieldConfig<any, any>> = {}

    for (const [name, field] of map.entries()) {
      record[name] = this.toFieldConfig(field, name)
    }

    return record
  }

  public toFieldConfig(
    field: Loom.BaseField,
    fieldName?: string
  ): GraphQLFieldConfig<any, any> {
    try {
      const outputType = this.getCacheType(
        getGraphQLType(field["~meta"].output),
        fieldName
      )

      return {
        ...extract(field),
        type: outputType,
        args: inputToArgs(field["~meta"].input, {
          fieldName: fieldName ? parentName(this.name) + fieldName : undefined,
        }),
        ...this.provideForResolve(field),
        ...this.provideForSubscribe(field),
      }
    } catch (error) {
      throw markErrorLocation(error)
    }
  }

  protected provideForResolve(
    field: Loom.BaseField
  ): Pick<GraphQLFieldConfig<any, any>, "resolve"> | undefined {
    if (field?.["~meta"]?.resolve == null) return
    if (field["~meta"].resolve === defaultSubscriptionResolve)
      return { resolve: defaultSubscriptionResolve }
    const resolve: GraphQLFieldResolver<any, any> =
      field["~meta"].operation === "field"
        ? (root, args, context, info) =>
            resolverPayloadStorage.run(
              { root, args, context, info, field },
              () => field["~meta"].resolve(root, args, this.resolverOptions)
            )
        : field["~meta"].operation === "subscription"
          ? (root, args, context, info) =>
              resolverPayloadStorage.run(
                { root, args, context, info, field },
                () => field["~meta"].resolve(root, args)
              )
          : (root, args, context, info) =>
              resolverPayloadStorage.run(
                { root, args, context, info, field },
                () => field["~meta"].resolve(args, this.resolverOptions)
              )

    return { resolve }
  }

  protected provideForSubscribe(
    field: Loom.BaseField | Loom.Subscription<any, any, any>
  ): Pick<GraphQLFieldConfig<any, any>, "subscribe"> | undefined {
    if (
      (field as Loom.Subscription<any, any, any>)?.["~meta"]?.subscribe == null
    )
      return
    return {
      subscribe: (root, args, context, info) =>
        resolverPayloadStorage.run(
          { root, args, context, info, field },
          async () => {
            const generator = await (field as Loom.Subscription<any, any, any>)[
              "~meta"
            ].subscribe?.(args, this.resolverOptions)
            return bindAsyncIterator(resolverPayloadStorage, generator)
          }
        ),
    }
  }

  protected getCacheType(
    gqlType: GraphQLOutputType,
    fieldName?: string
  ): GraphQLOutputType {
    return getCacheType(gqlType, { ...this.options, fieldName, parent: this })
  }

  public get options() {
    const { resolverOptions, weaverContext } = this
    return { resolverOptions, weaverContext }
  }
}

function extract(field: Loom.BaseField): Partial<GraphQLFieldConfig<any, any>> {
  const { deprecationReason, description, extensions } = field["~meta"]
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

export const OPERATION_OBJECT_NAMES = new Set([
  "Query",
  "Mutation",
  "Subscription",
])

export function getCacheType(
  gqlType: GraphQLOutputType,
  options: {
    weaverContext?: WeaverContext
    resolverOptions?: ResolvingOptions
    fieldName?: string
    parent?: LoomObjectType
  } = {}
): GraphQLOutputType {
  const context = options.weaverContext ?? weaverContext
  if (gqlType instanceof LoomObjectType) return gqlType
  if (isObjectType(gqlType)) {
    const gqlObject = context.loomObjectMap?.get(gqlType)
    if (gqlObject != null) return gqlObject

    const loomObject = new LoomObjectType(gqlType, options)
    context.loomObjectMap?.set(gqlType, loomObject)
    if (options.fieldName && options.parent) {
      loomObject.addAlias(
        parentName(options.parent.name) + pascalCase(options.fieldName)
      )
    }
    return loomObject
  } else if (isListType(gqlType)) {
    return new GraphQLList(getCacheType(gqlType.ofType, options))
  } else if (isNonNullType(gqlType)) {
    return new GraphQLNonNull(getCacheType(gqlType.ofType, options))
  } else if (isUnionType(gqlType)) {
    const existing = context.loomUnionMap?.get(gqlType)
    if (existing != null) return existing
    const config = gqlType.toConfig()
    const unionType = new GraphQLUnionType({
      ...config,
      types: config.types.map(
        (type) => getCacheType(type, options) as GraphQLObjectType
      ),
    })
    context.loomUnionMap?.set(gqlType, unionType)
    return unionType
  }
  return gqlType
}

function parentName(name: string): string {
  if (OPERATION_OBJECT_NAMES.has(name)) name = ""
  return name
}
