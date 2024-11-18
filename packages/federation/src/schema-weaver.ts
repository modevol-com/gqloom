import { printSubgraphSchema } from "@apollo/subgraph"
import {
  AnyType,
  EntityType,
  ServiceType,
  entitiesResolver,
} from "@apollo/subgraph/dist/types"
import {
  type GraphQLSilk,
  type Middleware,
  SchemaWeaver,
  type SilkResolver,
  type WeaverConfig,
  silk,
  silkQuery,
  silkResolver,
  useResolverPayload,
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

export class FederatedSchemaWeaver extends SchemaWeaver {
  public override weaveGraphQLSchema(): GraphQLSchema {
    const schema = super.weaveGraphQLSchema()
    const types = schema.getTypeMap()
    const entityTypes = Object.values(types).filter(
      (type) =>
        isObjectType(type) && FederatedSchemaWeaver.hasResolvableKey(type)
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
    const federatedResolver = silkResolver({
      ...(hasEntities && {
        _entities: silkQuery(EntitiesSilk, {
          input: { representations: RepresentationsSilk },
          resolve: ({ representations }) => {
            const { context, info = {} as GraphQLResolveInfo } =
              useResolverPayload() ?? {}
            return entitiesResolver({ representations, context, info })
          },
        }),
      }),
      _service: silkQuery(ServiceSilk, () => ({ sdl })),
    })

    this.addResolver(federatedResolver)

    const federatedSchema = mockAst(super.weaveGraphQLSchema())
    const sdl = printSubgraphSchema(lexicographicSortSchema(federatedSchema))
    return federatedSchema
  }

  static hasResolvableKey(type: GraphQLNamedType) {
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
   * @returns GraphQ LSchema
   */
  static override weave(
    ...inputs: (SilkResolver | Middleware | WeaverConfig | GraphQLSilk)[]
  ): GraphQLSchema {
    const { context, configs, middlewares, resolvers, silks } =
      SchemaWeaver.optionsFrom(...inputs)

    const weaver = new FederatedSchemaWeaver({}, context)
    configs.forEach((it) => weaver.setConfig(it))
    middlewares.forEach((it) => weaver.use(it))
    resolvers.forEach((it) => weaver.add(it))
    silks.forEach((it) => weaver.addType(it))

    return weaver.weaveGraphQLSchema()
  }
}
