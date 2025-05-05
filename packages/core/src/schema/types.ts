import type { GraphQLSchemaConfig } from "graphql"
import type { WEAVER_CONFIG } from "../utils/symbols"
import type { WeaverConfig, WeaverContext } from "./weaver-context"

export interface CoreSchemaWeaverConfigOptions extends GraphQLSchemaConfig {
  getInputObjectName?: (name: string) => string
  weaverContext?: WeaverContext
}

export interface CoreSchemaWeaverConfig
  extends WeaverConfig,
    CoreSchemaWeaverConfigOptions {
  [WEAVER_CONFIG]: "gqloom.core.schema"
}
