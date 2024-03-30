import { GraphQLSchema } from "graphql"
import type {
  AnyGraphQLFabric,
  GraphQLFabricIO,
  OperationOrField,
} from "../resolver"

type FabricQuery = OperationOrField<
  GraphQLFabricIO,
  any,
  AnyGraphQLFabric,
  AnyGraphQLFabric,
  "query"
>

type FabricMutation = OperationOrField<
  GraphQLFabricIO,
  any,
  AnyGraphQLFabric,
  AnyGraphQLFabric,
  "mutation"
>

type FabricSubscription = OperationOrField<
  GraphQLFabricIO,
  any,
  AnyGraphQLFabric,
  AnyGraphQLFabric,
  "subscription"
>

export class SchemaWeaver {
  queries: Record<string, FabricQuery> = {}
  mutations: Record<string, FabricMutation> = {}
  subscriptions: Record<string, FabricSubscription> = {}

  toGraphQLSchema(): GraphQLSchema {
    return new GraphQLSchema({})
  }
}
