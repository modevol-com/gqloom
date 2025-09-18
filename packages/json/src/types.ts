import { SYMBOLS, type WeaverConfig } from "@gqloom/core"
import type { GraphQLOutputType } from "graphql"
import type { JSONSchema } from "json-schema-to-ts"

export interface JSONWeaverConfigOptions {
  presetGraphQLType?: (schema: JSONSchema) => GraphQLOutputType | undefined
}

export interface JSONWeaverConfig
  extends WeaverConfig,
    JSONWeaverConfigOptions {
  [SYMBOLS.WEAVER_CONFIG]: "gqloom.json"
}
