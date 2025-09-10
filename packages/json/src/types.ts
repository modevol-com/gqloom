import { SYMBOLS, type WeaverConfig } from "@gqloom/core"

export interface JSONWeaverConfigOptions {}

export interface JSONWeaverConfig
  extends WeaverConfig,
    JSONWeaverConfigOptions {
  [SYMBOLS.WEAVER_CONFIG]: "gqloom.json"
}
