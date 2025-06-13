import { defineRelations } from "drizzle-orm"
import * as schema from "./index"

export const relations = defineRelations(schema, (r) => ({
  users: {
    cats: r.many.cats(),
  },
  cats: {
    owner: r.one.users({
      from: r.cats.ownerId,
      to: r.users.id,
    }),
  },
}))
