import type { GraphQLDirective } from "graphql"
import { GraphQLSchema } from "graphql"
import type { AnyGraphQLFabric, OperationOrField } from "../resolver"

type FabricQuery = OperationOrField<
  any,
  AnyGraphQLFabric,
  AnyGraphQLFabric,
  "query"
>

type FabricMutation = OperationOrField<
  any,
  AnyGraphQLFabric,
  AnyGraphQLFabric,
  "mutation"
>

type FabricSubscription = OperationOrField<
  any,
  AnyGraphQLFabric,
  AnyGraphQLFabric,
  "subscription"
>

export class SchemaWeaver {
  queries: Record<string, FabricQuery> = {}
  mutations: Record<string, FabricMutation> = {}
  subscriptions: Record<string, FabricSubscription> = {}

  objectTypes: Record<string, AnyGraphQLFabric> = {}
  otherTypes: AnyGraphQLFabric[] = []
  directives: GraphQLDirective[] = []

  weaveGraphQLSchema(): GraphQLSchema {
    return new GraphQLSchema({})
  }
}
