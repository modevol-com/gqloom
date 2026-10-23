import { createMemoization, useContext } from "@gqloom/core/context"
import { GraphQLError } from "graphql"
import type { YogaInitialContext } from "graphql-yoga"
import { db } from "../providers"

export const useCurrentUser = createMemoization(async () => {
  const phone =
    useContext<YogaInitialContext>().request.headers.get("authorization")
  if (phone == null) throw new GraphQLError("Unauthorized")

  const user = await db.query.users.findFirst({ where: { phone } })
  if (user == null) throw new GraphQLError("Unauthorized")
  return user
})
