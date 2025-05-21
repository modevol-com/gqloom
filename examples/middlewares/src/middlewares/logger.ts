import type { Middleware } from "@gqloom/core"
import { useResolverPayload } from "@gqloom/core/context"

export const logger: Middleware = async (next) => {
  const info = useResolverPayload()!.info

  const start = Date.now()
  const result = await next()
  const resolveTime = Date.now() - start

  console.info(`${info.parentType.name}.${info.fieldName} [${resolveTime} ms]`)
  return result
}
