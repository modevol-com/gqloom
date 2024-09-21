import { type Middleware } from "@gqloom/core"
import { useUser } from "../context"
import { GraphQLError } from "graphql"

export function authGuard(role: "admin" | "editor"): Middleware {
  return async (next) => {
    const user = await useUser()
    if (user == null) throw new GraphQLError("Not authenticated")
    if (!user.roles.includes(role)) throw new GraphQLError("Not authorized")
    return next()
  }
}
