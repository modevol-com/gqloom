import { PrismaLibSQL } from "@prisma/adapter-libsql"
import CREATE_TABLES from "../prisma/CREATE_TABLES"
import type { Prisma } from "./generated/prisma/client"
import { PrismaClient } from "./generated/prisma/client"

export const userData: Prisma.UserCreateInput[] = [
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

const adapter = new PrismaLibSQL({ url: ":memory:" })
const db = new PrismaClient({ adapter })

for (const statement of CREATE_TABLES) {
  await db.$executeRawUnsafe(statement)
}

await db.user.createMany({
  data: userData,
})

export { db }
