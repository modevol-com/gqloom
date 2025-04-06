import { db } from "../providers"
import { users } from "../schema"

export async function createUser(input: typeof users.$inferInsert) {
  const [user] = await db.insert(users).values(input).returning()
  return user
}

export async function findUsersByName(name: string) {
  return await db.query.users.findMany({
    where: { name },
  })
}

export async function findUserByPhone(phone: string) {
  return await db.query.users.findFirst({
    where: { phone },
  })
}
