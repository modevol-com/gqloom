import "dotenv/config"
import { defineConfig } from "drizzle-kit"
import { config } from "./env.config"

export default defineConfig({
  dialect: "postgresql",
  schema: "./test/schema/postgres.ts",
  dbCredentials: {
    url: config.postgresUrl,
  },
  tablesFilter: ["drizzle_*"],
})
