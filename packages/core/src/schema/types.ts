import type {
  AnyGraphQLSilk,
  OperationOrField,
  RESOLVER_OPTIONS_KEY,
  ResolverOptionsWithParent,
  ResolvingOptions,
} from "../resolver"

export type SilkOperationOrField = OperationOrField<
  AnyGraphQLSilk,
  AnyGraphQLSilk,
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
