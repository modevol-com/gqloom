import { silk, type Middleware } from "@gqloom/core"

export const outputValidator: Middleware = async (next, { outputSilk }) => {
  const output = await next()
  return await silk.parse(outputSilk, output)
}
