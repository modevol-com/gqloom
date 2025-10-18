import { PrismaBetterSQLite3 } from "@prisma/adapter-better-sqlite3"
import CREATE_TABLES from "../prisma/CREATE_TABLES"
import { type Prisma, PrismaClient } from "./generated/prisma/client"

const adapter = new PrismaBetterSQLite3({ url: ":memory:" })
const db = new PrismaClient({
  adapter,
  log: [{ emit: "stdout", level: "query" }],
})

const userData: Prisma.UserCreateInput[] = [
  {
    name: "Alice",
    email: "alice@prisma.io",
    posts: {
      create: [
        {
          title: "Join the Prisma Discord",
          content: "https://pris.ly/discord",
          published: true,
        },
      ],
    },
  },
  {
    name: "Nilu",
    email: "nilu@prisma.io",
    posts: {
      create: [
        {
          title: "Follow Prisma on Twitter",
          content: "https://www.twitter.com/prisma",
          published: true,
          viewCount: 42,
        },
      ],
    },
  },
  {
    name: "Mahmoud",
    email: "mahmoud@prisma.io",
    posts: {
      create: [
        {
          title: "Ask a question about Prisma on GitHub",
          content: "https://www.github.com/prisma/prisma/discussions",
          published: true,
          viewCount: 128,
        },
        {
          title: "Prisma on YouTube",
          content: "https://pris.ly/youtube",
        },
      ],
    },
  },
]
async function initializeDatabase() {
  await db.$connect()
  for (const statement of CREATE_TABLES) {
    await db.$executeRawUnsafe(statement)
  }

  for (const data of userData) {
    await db.user.create({ data })
  }
}

await initializeDatabase()
export { db }
