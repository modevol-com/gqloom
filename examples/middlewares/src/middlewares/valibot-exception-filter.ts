import type { Middleware } from "@gqloom/core"
import { GraphQLError } from "graphql"
import { ValiError } from "valibot"

export const ValibotExceptionFilter: Middleware = async (next) => {
  try {
    return await next()
  } catch (error) {
    if (error instanceof ValiError) {
      const { issues, message } = error
      throw new GraphQLError(message, { extensions: { issues } })
    }
    throw error
  }
}
