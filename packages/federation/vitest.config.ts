import * as path from "path"
import { defineProject, mergeConfig } from "vitest/config"
import { projectConfig } from "../../vitest.config"

export default mergeConfig(
  projectConfig,
  defineProject({
    resolve: {
      alias: {
        graphql: path.resolve(__dirname, "./node_modules/graphql"),
      },
    },
  })
)
