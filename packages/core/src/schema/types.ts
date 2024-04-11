import type {
  AnyGraphQLSilk,
  OperationOrField,
  ResolvingOptions,
} from "../resolver"

export type SilkOperationOrField = OperationOrField<
  AnyGraphQLSilk,
  AnyGraphQLSilk,
  any,
  any
>

export interface FieldConvertOptions {
  optionsForGetType?: Record<string | number | symbol, any>
  optionsForResolving?: ResolvingOptions
}
