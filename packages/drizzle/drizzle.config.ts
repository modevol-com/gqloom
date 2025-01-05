import { defineConfig } from "drizzle-kit"

export default defineConfig({
  dialect: "sqlite",
  schema: "./test/db/schema.ts",
  dbCredentials: {
    url: "file:./test/db/local.db",
  },
})
