import { entitiesResolver } from "@apollo/subgraph"
import {
  type GraphQLFieldConfig,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLString,
  GraphQLUnionType,
} from "graphql"

/**
 * Federation GraphQL types that @apollo/subgraph 2.15 no longer exports
 * from `@apollo/subgraph/dist/types`. Shapes match subgraph-js 2.14.
 */
export const EntityType = new GraphQLUnionType({
  name: "_Entity",
  types: [],
})

export const ServiceType = new GraphQLObjectType({
  name: "_Service",
  fields: {
    sdl: {
      type: GraphQLString,
      description:
        "The sdl representing the federated service capabilities. Includes federation directives, removes federation types, and includes rest of full schema after schema directives have been applied",
    },
  },
})

export const AnyType = new GraphQLScalarType({
  name: "_Any",
  serialize(value) {
    return value
  },
})

export const entitiesField: GraphQLFieldConfig<any, any> = {
  type: new GraphQLNonNull(new GraphQLList(EntityType)),
  args: {
    representations: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(AnyType))),
    },
  },
  resolve(_source, { representations }, context, info) {
    return entitiesResolver({ representations, context, info })
  },
}
