import { defineConfig } from "drizzle-kit"
import { config } from "./env.config"

export default defineConfig({
  out: "./drizzle",
  schema: "./src/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: config.databaseUrl,
  },
})
