import { drizzle } from "drizzle-orm/node-postgres"
import { reset, seed } from "drizzle-seed"
import { config } from "../env.config"
import * as schema from "./schema"

async function main() {
  const db = drizzle(config.databaseUrl, { logger: true })
  await reset(db, schema)
  await seed(db, schema).refine(() => ({
    users: {
      count: 20,
      with: {
        posts: [
          { weight: 0.6, count: [1, 2, 3] },
          { weight: 0.3, count: [5, 6, 7] },
          { weight: 0.1, count: [8, 9, 10] },
        ],
      },
    },
  }))
}

main().catch((err) => {
  // biome-ignore lint/suspicious/noConsole: <explanation>
  console.error(err)
  process.exit(1)
})
