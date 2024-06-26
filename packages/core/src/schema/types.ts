import type {
  GraphQLSilk,
  FieldOrOperation,
  ResolverOptionsWithParent,
  ResolvingOptions,
} from "../resolver"
import { type RESOLVER_OPTIONS_KEY } from "../utils/symbols"

export type SilkOperationOrField = FieldOrOperation<
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
  FieldOrOperation<any, any, any, any>
> & {
  [RESOLVER_OPTIONS_KEY]?: ResolverOptionsWithParent
}
