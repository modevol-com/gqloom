import { mergeConfig } from "vitest/config"
import { dedupeGraphqlConfig, projectConfig } from "../../vitest.config"

export default mergeConfig(projectConfig, dedupeGraphqlConfig)
