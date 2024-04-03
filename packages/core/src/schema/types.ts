import type { AnyGraphQLSilk, OperationOrField, InputSchema } from "../resolver"

export type SilkQuery = OperationOrField<
  any,
  AnyGraphQLSilk,
  InputSchema<AnyGraphQLSilk>,
  "query"
>
export type SilkMutation = OperationOrField<
  any,
  AnyGraphQLSilk,
  InputSchema<AnyGraphQLSilk>,
  "mutation"
>
export type SilkSubscription = OperationOrField<
  any,
  AnyGraphQLSilk,
  InputSchema<AnyGraphQLSilk>,
  "subscription"
>
export type SilkField = OperationOrField<
  AnyGraphQLSilk,
  AnyGraphQLSilk,
  InputSchema<AnyGraphQLSilk>,
  "field"
>

export type SilkOperationOrField = OperationOrField<
  any,
  AnyGraphQLSilk,
  InputSchema<AnyGraphQLSilk>
>
