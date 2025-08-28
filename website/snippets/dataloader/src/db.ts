// @paths: {"src/*": ["snippets/dataloader/src/*"]}
import { drizzle } from "drizzle-orm/node-postgres"
import * as tables from "src/schema"

const config = { databaseUrl: "" }
export const db = drizzle(config.databaseUrl, { schema: tables, logger: true })
