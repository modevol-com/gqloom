import { drizzle } from "drizzle-orm/libsql"
import * as schema from "../schema"
import { relations } from "../schema/relations"

export const db = drizzle(process.env.DB_FILE_NAME ?? "file:local.db", {
  schema,
  relations,
})
