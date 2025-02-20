import { createMemoization, useContext } from "@gqloom/core"
import { GraphQLError } from "graphql"
import type { YogaInitialContext } from "graphql-yoga"
import { userService } from "../services"

export const useCurrentUser = createMemoization(async () => {
  const phone =
    useContext<YogaInitialContext>().request.headers.get("authorization")
  if (phone == null) throw new GraphQLError("Unauthorized")

  const user = await userService.findUserByPhone(phone)
  if (user == null) throw new GraphQLError("Unauthorized")
  return user
})
