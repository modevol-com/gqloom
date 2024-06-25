import type {
  GraphQLSilk,
  OperationOrField,
  ResolverOptionsWithParent,
  ResolvingOptions,
} from "../resolver"
import { type RESOLVER_OPTIONS_KEY } from "../utils/symbols"

export type SilkOperationOrField = OperationOrField<
  GraphQLSilk,
  GraphQLSilk,
  any,
  any
>

export interface FieldConvertOptions {
  optionsForResolving?: ResolvingOptions
}

export type SilkResolver = Record<
  string,
  OperationOrField<any, any, any, any>
> & {
  [RESOLVER_OPTIONS_KEY]?: ResolverOptionsWithParent
}
