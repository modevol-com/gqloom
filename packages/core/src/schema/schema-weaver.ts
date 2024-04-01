import { GraphQLSchema } from "graphql"
import type { AnyGraphQLSilk, OperationOrField } from "../resolver"

type SilkQuery = OperationOrField<any, AnyGraphQLSilk, AnyGraphQLSilk, "query">

type SilkMutation = OperationOrField<
  any,
  AnyGraphQLSilk,
  AnyGraphQLSilk,
  "mutation"
>

type SilkSubscription = OperationOrField<
  any,
  AnyGraphQLSilk,
  AnyGraphQLSilk,
  "subscription"
>

export class SchemaWeaver {
  queries: Record<string, SilkQuery> = {}
  mutations: Record<string, SilkMutation> = {}
  subscriptions: Record<string, SilkSubscription> = {}

  objectTypes: Record<string, AnyGraphQLSilk> = {}
  fields: Record<string, AnyGraphQLSilk> = {}

  weaveGraphQLSchema(): GraphQLSchema {
    return new GraphQLSchema({})
  }
}
