// @paths: {"src/*": ["snippets/dataloader/src/*"]}
import { drizzle } from "drizzle-orm/node-postgres"
import { relations } from "src/schema"

const config = { databaseUrl: "" }
export const db = drizzle(config.databaseUrl, { relations, logger: true })
