const db = {} as {
  beginTransaction: () => Promise<void>
  commit: () => Promise<void>
  rollback: () => Promise<void>
}

// ---cut---
import type { Middleware } from "@gqloom/core"
import { GraphQLError } from "graphql"

export const transaction: Middleware = async ({ next }) => {
  try {
    await db.beginTransaction()

    const result = await next()

    await db.commit()

    return result
  } catch (error) {
    await db.rollback()
    throw new GraphQLError("Transaction failed", {
      extensions: { originalError: error },
    })
  }
}

transaction.operations = ["mutation"]
