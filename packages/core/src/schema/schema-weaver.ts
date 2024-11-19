import {
  type GraphQLNamedType,
  GraphQLSchema,
  type GraphQLSchemaConfig,
  isEnumType,
  isNonNullType,
  isObjectType,
  isUnionType,
} from "graphql"
import {
  type GraphQLSilk,
  ResolverOptionsMap,
  type ResolvingOptions,
  getGraphQLType,
  isSilk,
} from "../resolver"
import type { Middleware } from "../utils"
import { FIELD_HIDDEN, WEAVER_CONFIG } from "../utils/symbols"
import { LoomObjectType } from "./object"
import {
  type SchemaVendorWeaver,
  isSchemaVendorWeaver,
} from "./schema-vendor-weaver"
import type {
  CoreSchemaWeaverConfig,
  CoreSchemaWeaverConfigOptions,
  SilkResolver,
} from "./types"
import {
  type WeaverConfig,
  type WeaverContext,
  initWeaverContext,
  provideWeaverContext,
} from "./weaver-context"

interface SchemaWeaverParameters
  extends Partial<
      Record<"query" | "mutation" | "subscription", LoomObjectType>
    >,
    Pick<GraphQLSchemaConfig, "types"> {}

export class SchemaWeaver {
  public query?: LoomObjectType
  public mutation?: LoomObjectType
  public subscription?: LoomObjectType
  public types: Set<GraphQLNamedType>

  public context: WeaverContext

  public resolverOptions?: ResolvingOptions

  /**
   * Create a Schema Weaver config object
   * @param config Schema Weaver config options
   * @returns a Schema Weaver config object
   */
  static config(config: CoreSchemaWeaverConfigOptions): CoreSchemaWeaverConfig {
    return {
      ...config,
      [WEAVER_CONFIG]: "gqloom.core.schema",
    }
  }

  constructor(
    { query, mutation, subscription, types }: SchemaWeaverParameters = {},
    context?: WeaverContext
  ) {
    if (query != null) this.query = query
    if (mutation != null) this.mutation = mutation
    if (subscription != null) this.subscription = subscription
    this.types = new Set(types ?? [])
    this.context = context ?? initWeaverContext()
  }

  public use(...middlewares: Middleware[]) {
    this.resolverOptions ??= {}
    this.resolverOptions.middlewares ??= []
    this.resolverOptions.middlewares.push(...middlewares)
    return this
  }

  public add(resolver: SilkResolver) {
    provideWeaverContext(() => this.addResolver(resolver), this.context)
    return this
  }

  public addVendor(weaver: SchemaVendorWeaver) {
    this.context.vendorWeavers.set(weaver.vendor, weaver)
    return this
  }

  public addType(silk: GraphQLSilk) {
    const gqlType = provideWeaverContext(() => {
      let gqlType = getGraphQLType(silk)
      if (isNonNullType(gqlType)) gqlType = gqlType.ofType

      if (isObjectType(gqlType)) {
        const existing = this.context.loomObjectMap.get(gqlType)
        if (existing != null) return existing
        const extraObject = new LoomObjectType(gqlType, this.fieldOptions)
        this.context.loomObjectMap.set(gqlType, extraObject)
        return extraObject
      } else if (isUnionType(gqlType) || isEnumType(gqlType)) {
        return gqlType
      }

      throw new Error(
        `${(gqlType as any)?.name ?? gqlType.toString()} is not a named type`
      )
    }, this.context)
    this.types.add(gqlType)
    return this
  }

  public setConfig<TConfig extends WeaverConfig>(config: TConfig) {
    this.context.setConfig(config)
    return this
  }

  public weaveGraphQLSchema(): GraphQLSchema {
    const { query, mutation, subscription, types } = this
    const config =
      this.context.getConfig<CoreSchemaWeaverConfig>("gqloom.core.schema")
    const schema = new GraphQLSchema({
      query,
      mutation,
      subscription,
      types: [...(types ?? []), ...(config?.types ?? [])],
      ...config,
    })

    return schema
  }

  protected addResolver(resolver: SilkResolver) {
    const resolverOptions = ResolverOptionsMap.get(resolver)
    const parent = resolverOptions?.parent
    const parentObject = (() => {
      if (parent == null) return undefined
      let gqlType = getGraphQLType(parent)

      if (isNonNullType(gqlType)) gqlType = gqlType.ofType

      if (!isObjectType(gqlType)) {
        throw new Error(
          `${(gqlType as any)?.name ?? gqlType.toString()} is not an object type`
        )
      }

      const existing = this.context.loomObjectMap.get(gqlType)
      if (existing != null) return existing
      const extraObject = new LoomObjectType(gqlType, this.fieldOptions)
      this.context.loomObjectMap.set(gqlType, extraObject)
      this.types.add(extraObject)
      return extraObject
    })()

    if (resolverOptions?.extensions && parentObject)
      parentObject.mergeExtensions(resolverOptions.extensions)

    Object.entries(resolver).forEach(([name, operation]) => {
      if (operation === FIELD_HIDDEN) {
        if (parentObject == null) return
        parentObject.hideField(name)
      } else if (operation.type === "field") {
        if (parentObject == null) return
        parentObject.addField(name, operation)
      } else {
        const operationObject = this.getOperationObject(operation.type)
        operationObject.addField(name, operation)
      }
    })
    return this
  }

  protected getOperationObject(
    type: "query" | "mutation" | "subscription"
  ): LoomObjectType {
    switch (type) {
      case "query": {
        this.query ??= new LoomObjectType(
          { name: "Query", fields: {} },
          this.fieldOptions
        )
        return this.query
      }
      case "mutation": {
        this.mutation ??= new LoomObjectType(
          { name: "Mutation", fields: {} },
          this.fieldOptions
        )
        return this.mutation
      }
      case "subscription": {
        this.subscription ??= new LoomObjectType(
          { name: "Subscription", fields: {} },
          this.fieldOptions
        )
        return this.subscription
      }
    }
  }

  protected get fieldOptions() {
    const { resolverOptions, context } = this
    return { resolverOptions, weaverContext: context }
  }

  static optionsFrom(
    ...inputs: (
      | SilkResolver
      | Middleware
      | SchemaVendorWeaver
      | WeaverConfig
      | GraphQLSilk
    )[]
  ) {
    const configs = new Set<WeaverConfig>()
    const middlewares = new Set<Middleware>()
    const resolvers = new Set<SilkResolver>()
    const silks = new Set<GraphQLSilk>()
    const weavers = new Set<SchemaVendorWeaver>()
    let context: WeaverContext | undefined

    for (const item of inputs) {
      if (isSchemaVendorWeaver(item)) {
        weavers.add(item)
      } else if (typeof item === "function") {
        middlewares.add(item)
      } else if (WEAVER_CONFIG in item) {
        configs.add(item)
        if (item.vendorWeaver) weavers.add(item.vendorWeaver)

        if (
          (item as CoreSchemaWeaverConfig)[WEAVER_CONFIG] ===
          "gqloom.core.schema"
        ) {
          context = (item as CoreSchemaWeaverConfig).weaverContext
        }
      } else if (isSilk(item)) {
        silks.add(item)
      } else {
        resolvers.add(item)
      }
    }

    return { context, configs, middlewares, resolvers, silks, weavers }
  }

  /**
   * Weave a GraphQL Schema from resolvers
   * @param inputs Resolvers, Global Middlewares or WeaverConfigs
   * @returns GraphQ LSchema
   */
  static weave(
    ...inputs: (
      | SilkResolver
      | Middleware
      | SchemaVendorWeaver
      | WeaverConfig
      | GraphQLSilk
    )[]
  ) {
    const { context, configs, middlewares, resolvers, silks, weavers } =
      SchemaWeaver.optionsFrom(...inputs)

    const weaver = new SchemaWeaver({}, context)

    configs.forEach((it) => weaver.setConfig(it))
    weavers.forEach((it) => weaver.addVendor(it))
    middlewares.forEach((it) => weaver.use(it))
    resolvers.forEach((it) => weaver.add(it))
    silks.forEach((it) => weaver.addType(it))

    return weaver.weaveGraphQLSchema()
  }
}

/**
 * Weave a GraphQL Schema from resolvers
 * @param inputs Resolvers, Global Middlewares or WeaverConfigs
 * @returns GraphQ LSchema
 */
export const weave = SchemaWeaver.weave
