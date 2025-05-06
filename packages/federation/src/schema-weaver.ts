import { printSubgraphSchema } from "@apollo/subgraph"
import {
  AnyType,
  EntityType,
  ServiceType,
  entitiesResolver,
} from "@apollo/subgraph/dist/types"
import {
  GraphQLSchemaLoom,
  type GraphQLSilk,
  type Loom,
  type Middleware,
  type WeaverConfig,
  query,
  resolver,
  silk,
} from "@gqloom/core"
import {
  GraphQLList,
  type GraphQLNamedType,
  GraphQLNonNull,
  type GraphQLResolveInfo,
  type GraphQLSchema,
  GraphQLUnionType,
  isObjectType,
  lexicographicSortSchema,
} from "graphql"
import { mockAst } from "./mock-ast"

export class FederatedSchemaLoom extends GraphQLSchemaLoom {
  public override weaveGraphQLSchema(): GraphQLSchema {
    const schema = super.weaveGraphQLSchema()
    const types = schema.getTypeMap()
    const entityTypes = Object.values(types).filter(
      (type) => isObjectType(type) && FederatedSchemaLoom.hasResolvableKey(type)
    )

    const unionEntityType = new GraphQLUnionType({
      ...EntityType.toConfig(),
      types: entityTypes.filter(isObjectType),
    })

    const EntitiesSilk = silk(
      new GraphQLNonNull(new GraphQLList(unionEntityType))
    )

    const RepresentationsSilk = silk<any[]>(
      new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(AnyType)))
    )

    const ServiceSilk = silk(ServiceType)

    const hasEntities = entityTypes.length > 0
    const federatedResolver = resolver({
      ...(hasEntities && {
        _entities: query(EntitiesSilk, {
          input: { representations: RepresentationsSilk },
          resolve: ({ representations }, payload) => {
            const { context, info = {} as GraphQLResolveInfo } = payload ?? {}
            return entitiesResolver({ representations, context, info })
          },
        }),
      }),
      _service: query(ServiceSilk, () => ({ sdl })),
    })

    this.addResolver(federatedResolver)

    const federatedSchema = mockAst(super.weaveGraphQLSchema())
    const sdl = printSubgraphSchema(lexicographicSortSchema(federatedSchema))
    return federatedSchema
  }

  public static hasResolvableKey(type: GraphQLNamedType) {
    if (Array.isArray(type.extensions?.directives)) {
      return type.extensions?.directives.some(
        (d: { name: string; args: Record<string, unknown> }) =>
          d.name === "key" && d.args.resolvable !== false
      )
    }

    const directives = (type.extensions?.directives ?? {}) as {
      key?: { resolvable?: boolean }[] | { resolvable?: boolean }
    }
    if (!("key" in directives)) {
      return false
    }

    if (Array.isArray(directives.key)) {
      return directives.key.some((d) => d.resolvable !== false)
    }

    return directives.key?.resolvable !== false
  }

  /**
   * Weave a GraphQL Schema from resolvers
   * @param inputs Resolvers, Global Middlewares or WeaverConfigs
   * @returns GraphQL Schema
   */
  public static override weave(
    ...inputs: (Loom.Resolver | Middleware | WeaverConfig | GraphQLSilk)[]
  ): GraphQLSchema {
    const { context, configs, middlewares, resolvers, silks, weavers } =
      GraphQLSchemaLoom.optionsFrom(...inputs)

    const weaver = new FederatedSchemaLoom({}, context)

    weavers.forEach((it) => weaver.addVendor(it))
    configs.forEach((it) => weaver.setConfig(it))
    middlewares.forEach((it) => weaver.use(it))
    resolvers.forEach((it) => weaver.add(it))
    silks.forEach((it) => weaver.addType(it))

    return weaver.weaveGraphQLSchema()
  }
}

export const weave = FederatedSchemaLoom.weave
