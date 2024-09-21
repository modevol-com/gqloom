import { type Middleware } from "@gqloom/core"
import { ValiError } from "valibot"
import { GraphQLError } from "graphql"

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
