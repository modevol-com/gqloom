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
  type Loom,
  type ResolvingOptions,
  getGraphQLType,
  isSilk,
} from "../resolver"
import type { Middleware } from "../utils"
import { FIELD_HIDDEN, IS_RESOLVER, WEAVER_CONFIG } from "../utils/symbols"
import { LoomObjectType } from "./object"
import { type SchemaWeaver, isSchemaVendorWeaver } from "./schema-weaver"
import type {
  CoreSchemaWeaverConfig,
  CoreSchemaWeaverConfigOptions,
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

export class GraphQLSchemaLoom {
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

  public add(resolver: Loom.Resolver) {
    provideWeaverContext(() => this.addResolver(resolver), this.context)
    return this
  }

  public addVendor(weaver: SchemaWeaver) {
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

  protected addResolver(resolver: Loom.Resolver) {
    const resolverOptions = resolver["~meta"].options
    const parent = resolver["~meta"].parent
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

    Object.entries(resolver["~meta"].fields).forEach(([name, field]) => {
      if (field === FIELD_HIDDEN) {
        if (parentObject == null) return
        parentObject.hideField(name)
      } else if (field["~meta"].operation === "field") {
        if (parentObject == null) return
        parentObject.addField(name, field)
      } else {
        const operationObject = this.getOperationObject(
          field["~meta"].operation
        )
        operationObject.addField(name, field)
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
      | Loom.Resolver
      | Middleware
      | SchemaWeaver
      | WeaverConfig
      | GraphQLSilk
    )[]
  ) {
    const configs = new Set<WeaverConfig>()
    const middlewares = new Set<Middleware>()
    const resolvers = new Set<Loom.Resolver>()
    const silks = new Set<GraphQLSilk>()
    const weavers = new Set<SchemaWeaver>()
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
      } else if (item["~meta"][IS_RESOLVER]) {
        resolvers.add(item)
      }
    }

    return { context, configs, middlewares, resolvers, silks, weavers }
  }

  /**
   * Weave a GraphQL Schema from resolvers
   * @param inputs Resolvers, Global Middlewares, WeaverConfigs Or SchemaWeaver
   * @returns GraphQL Schema
   */
  static weave(
    ...inputs: (
      | Loom.Resolver
      | Middleware
      | SchemaWeaver
      | WeaverConfig
      | GraphQLSilk
    )[]
  ) {
    const { context, configs, middlewares, resolvers, silks, weavers } =
      GraphQLSchemaLoom.optionsFrom(...inputs)

    const weaver = new GraphQLSchemaLoom({}, context)

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
 * @returns GraphQL Schema
 */
export const weave = GraphQLSchemaLoom.weave
