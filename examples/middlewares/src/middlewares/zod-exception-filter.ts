import { type Middleware } from "@gqloom/core"
import { ZodError } from "zod"
import { GraphQLError } from "graphql"

export const ZodExceptionFilter: Middleware = async (next) => {
  try {
    return await next()
  } catch (error) {
    if (error instanceof ZodError) {
      throw new GraphQLError(error.format()._errors.join(", "), {
        extensions: { issues: error.issues },
      })
    }
    throw error
  }
}
