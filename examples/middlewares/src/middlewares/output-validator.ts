import { type Middleware, silk } from "@gqloom/core"

export const outputValidator: Middleware = async (opts) => {
  const output = await opts.next()
  return await silk.parse(opts.outputSilk, output)
}
