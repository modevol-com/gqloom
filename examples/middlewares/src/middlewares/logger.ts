import { type Middleware, useResolverPayload } from "@gqloom/core"

export const logger: Middleware = async (next) => {
  const info = useResolverPayload()!.info

  const start = Date.now()
  const result = await next()
  const resolveTime = Date.now() - start

  // eslint-disable-next-line no-console
  console.log(`${info.parentType.name}.${info.fieldName} [${resolveTime} ms]`)
  return result
}
