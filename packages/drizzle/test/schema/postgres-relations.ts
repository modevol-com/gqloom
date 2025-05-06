import { defineRelations } from "drizzle-orm"
import * as schema from "./postgres"

export const relations = defineRelations(schema, (r) => ({
  users: {
    posts: r.many.posts(),
  },
  posts: {
    author: r.one.users({
      from: r.posts.authorId,
      to: r.users.id,
    }),
  },
}))
