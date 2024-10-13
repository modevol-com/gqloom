import {
  GraphQLList,
  type GraphQLOutputType,
  GraphQLNonNull,
  GraphQLInt,
  GraphQLFloat,
  GraphQLID,
  GraphQLString,
  GraphQLBoolean,
} from "graphql"

export function capitalize(str: string) {
  return str.slice(0, 1).toUpperCase() + str.slice(1)
}

export const gqlType = {
  int: GraphQLInt,
  float: GraphQLFloat,
  id: GraphQLID,
  string: GraphQLString,
  boolean: GraphQLBoolean,
  list: (type: GraphQLOutputType) => new GraphQLList(new GraphQLNonNull(type)),
  nonNull: (type: GraphQLOutputType) => new GraphQLNonNull(type),
}
