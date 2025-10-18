import { PrismaLibSQL } from "@prisma/adapter-libsql"
import CREATE_TABLES from "../prisma/CREATE_TABLES"
import { PrismaClient } from "./generated/prisma/client"

const adapter = new PrismaLibSQL({ url: ":memory:" })
const db = new PrismaClient({ adapter })

for (const statement of CREATE_TABLES) {
  await db.$executeRawUnsafe(statement)
}

export { db }
