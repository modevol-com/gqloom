import "dotenv/config"
import { defineConfig } from "drizzle-kit"

export default defineConfig({
  dialect: "postgresql",
  schema: "./test/schema/postgres.ts",
  dbCredentials: {
    url:
      process.env.POSTGRESQL_URL ??
      "postgres://postgres@localhost:5432/postgres",
  },
  tablesFilter: ["drizzle_*"],
})
