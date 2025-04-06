import { defineRelations } from "drizzle-orm"
import * as schema from "./mysql"

export const relations = defineRelations(schema, (r) => ({
  user: {
    posts: r.many.post(),
  },
  post: {
    author: r.one.user({
      from: r.post.authorId,
      to: r.user.id,
    }),
  },
}))
