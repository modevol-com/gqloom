import { type GraphQLSchemaConfig } from "graphql"
import type { FieldOrOperation, ResolvingOptions } from "../resolver"
import { type WEAVER_CONFIG } from "../utils/symbols"
import { type WeaverContext, type WeaverConfig } from "./weaver-context"

export type SilkFieldOrOperation = FieldOrOperation<any, any, any, any>

export interface FieldConvertOptions {
  optionsForResolving?: ResolvingOptions
}

export type SilkResolver = Record<string, FieldOrOperation<any, any, any, any>>

export interface CoreSchemaWeaverConfigOptions extends GraphQLSchemaConfig {
  getInputObjectName?: (name: string) => string
  mockAST?: boolean
  weaverContext?: WeaverContext
}

export interface CoreSchemaWeaverConfig
  extends WeaverConfig,
    CoreSchemaWeaverConfigOptions {
  [WEAVER_CONFIG]: "gqloom.core.schema"
}
