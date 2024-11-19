import type { Middleware } from "@gqloom/core"
import { GraphQLError } from "graphql"
import { ZodError } from "zod"

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
