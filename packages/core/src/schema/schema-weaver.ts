import {
  type GraphQLNamedType,
  GraphQLSchema,
  isObjectType,
  type GraphQLSchemaConfig,
  isNonNullType,
} from "graphql"
import {
  RESOLVER_OPTIONS_KEY,
  getGraphQLType,
  type ResolvingOptions,
} from "../resolver"
import { LoomObjectType } from "./object"
import { type Middleware } from "../utils"
import {
  type WeaverConfig,
  initWeaverContext,
  provideWeaverContext,
  type WeaverContext,
} from "./weaver-context"
import { type SilkResolver } from "./types"
import { WEAVER_CONFIG } from "../utils/symbols"

interface SchemaWeaverParameters
  extends Partial<
      Record<"query" | "mutation" | "subscription", LoomObjectType>
    >,
    Pick<GraphQLSchemaConfig, "types"> {}

export class SchemaWeaver {
  public query?: LoomObjectType
  public mutation?: LoomObjectType
  public subscription?: LoomObjectType
  public types?: GraphQLNamedType[] | null

  public context: WeaverContext = initWeaverContext()

  public resolverOptions?: ResolvingOptions

  constructor({
    query,
    mutation,
    subscription,
    types,
  }: SchemaWeaverParameters = {}) {
    if (query != null) this.query = query
    if (mutation != null) this.mutation = mutation
    if (subscription != null) this.subscription = subscription
    if (types != null) this.types = types.slice()
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

  public setConfig<TConfig extends WeaverConfig>(config: TConfig) {
    this.context.setConfig(config)
    return this
  }

  public weaveGraphQLSchema(): GraphQLSchema {
    const { query, mutation, subscription, types } = this
    return new GraphQLSchema({ query, mutation, subscription, types })
  }

  protected addResolver(resolver: SilkResolver) {
    const parent = resolver[RESOLVER_OPTIONS_KEY]?.parent
    const parentObject = (() => {
      if (parent == null) return undefined
      let gqlType = getGraphQLType(parent)

      if (isNonNullType(gqlType)) gqlType = gqlType.ofType

      if (isObjectType(gqlType)) {
        const existing = this.context.loomObjectMap.get(gqlType)
        if (existing != null) return existing
        const extraObject = new LoomObjectType(gqlType, this.fieldOptions)
        this.context.loomObjectMap.set(gqlType, extraObject)
        return extraObject
      }
      throw new Error(
        `${(gqlType as any)?.name ?? gqlType.toString()} is not an object type`
      )
    })()

    Object.entries(resolver).forEach(([name, operation]) => {
      if ((name as any) === RESOLVER_OPTIONS_KEY) return
      if (operation.type === "field") {
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
      case "query":
        if (this.query) return this.query
        return (this.query = new LoomObjectType(
          { name: "Query", fields: {} },
          this.fieldOptions
        ))
      case "mutation":
        if (this.mutation) return this.mutation
        return (this.mutation = new LoomObjectType(
          { name: "Mutation", fields: {} },
          this.fieldOptions
        ))
      case "subscription":
        if (this.subscription) return this.subscription
        return (this.subscription = new LoomObjectType(
          { name: "Subscription", fields: {} },
          this.fieldOptions
        ))
    }
  }

  protected get fieldOptions() {
    const { resolverOptions, context } = this
    return { resolverOptions, weaverContext: context }
  }
}

/**
 * Weave a GraphQL Schema from resolvers
 * @param inputs Resolvers, Global Middlewares or WeaverConfigs
 * @returns GraphQ LSchema
 */
export function weave(...inputs: (SilkResolver | Middleware | WeaverConfig)[]) {
  const configs = new Set<WeaverConfig>()
  const middlewares = new Set<Middleware>()
  const resolvers = new Set<SilkResolver>()

  for (const item of inputs) {
    if (typeof item === "function") {
      middlewares.add(item)
    } else if (WEAVER_CONFIG in item) {
      configs.add(item)
    } else {
      resolvers.add(item)
    }
  }
  const weaver = new SchemaWeaver()
  configs.forEach((it) => weaver.setConfig(it))
  middlewares.forEach((it) => weaver.use(it))
  resolvers.forEach((it) => weaver.add(it))
  return weaver.weaveGraphQLSchema()
}
