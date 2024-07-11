import type {
  FieldOrOperation,
  ResolverOptionsWithParent,
  ResolvingOptions,
} from "../resolver"
import { type WEAVER_CONFIG, type RESOLVER_OPTIONS_KEY } from "../utils/symbols"
import { type WeaverConfig } from "./weaver-context"

export type SilkFieldOrOperation = FieldOrOperation<any, any, any, any>

export interface FieldConvertOptions {
  optionsForResolving?: ResolvingOptions
}

export type SilkResolver = Record<
  string,
  FieldOrOperation<any, any, any, any>
> & {
  [RESOLVER_OPTIONS_KEY]?: ResolverOptionsWithParent
}

export interface CoreSchemaWeaverConfigOptions {
  getInputObjectName?: (name: string) => string
}

export interface CoreSchemaWeaverConfig
  extends WeaverConfig,
    CoreSchemaWeaverConfigOptions {
  [WEAVER_CONFIG]: "gqloom.core.schema"
}
