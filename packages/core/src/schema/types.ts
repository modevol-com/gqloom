import type { AnyGraphQLSilk, OperationOrField, InputSchema } from "../resolver"

export type SilkOperationOrField = OperationOrField<
  any,
  AnyGraphQLSilk,
  InputSchema<AnyGraphQLSilk>
>
