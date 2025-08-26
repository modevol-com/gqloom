// @paths: {"src/*": ["snippets/guide-valibot/src/*"]}
import { drizzle } from "drizzle-orm/libsql"
import * as schema from "src/schema"

export const db = drizzle(process.env.DB_FILE_NAME ?? "file:local.db", {
  schema,
})
