import { SYMBOLS, type WeaverConfig } from "@gqloom/core"
import type { Column } from "drizzle-orm"
import type { GraphQLOutputType } from "graphql"

export interface DrizzleWeaverConfigOptions {
  presetGraphQLType?: (column: Column) => GraphQLOutputType | undefined
}

export interface DrizzleWeaverConfig
  extends WeaverConfig,
    DrizzleWeaverConfigOptions {
  [SYMBOLS.WEAVER_CONFIG]: "gqloom.drizzle"
}
