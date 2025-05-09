import { defineConfig } from "drizzle-kit"
import { config } from "./env.config"

export default defineConfig({
  dialect: "mysql",
  schema: "./test/schema/mysql.ts",
  dbCredentials: {
    url: config.mysqlUrl,
  },
  tablesFilter: ["drizzle_user", "drizzle_post"],
})
