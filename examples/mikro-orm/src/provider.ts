import type { Middleware } from "@gqloom/core"
import { createMemoization } from "@gqloom/core/context"
import { MikroORM } from "@mikro-orm/libsql"
import { Post, User } from "./entities"

export let orm: MikroORM

export const ormPromise = MikroORM.init({
  entities: [User, Post],
  dbName: ":memory:",
  debug: true,
}).then(async (o) => {
  orm = o
  await orm.getSchemaGenerator().updateSchema()
})

export const useEm = createMemoization(() => orm.em.fork())

export const flusher: Middleware = async ({ next }) => {
  const result = await next()
  await useEm().flush()
  return result
}
