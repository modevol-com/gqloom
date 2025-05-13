import type { Middleware } from "@gqloom/core"

/** Simple in-memory cache implementation */
const cacheStore = new Map<string, { data: unknown; timestamp: number }>()

export interface CacheOptions {
  /**
   * Time to live in milliseconds
   * @default 60000
   */
  ttl?: number
}

export const cache = (options: CacheOptions = {}): Middleware => {
  const { ttl = 60000 } = options

  const middleware: Middleware = async ({ next, payload }) => {
    if (!payload?.info) {
      return next()
    }

    const { fieldName, parentType } = payload.info
    const args = payload.args || {}
    const cacheKey = `${parentType.name}.${fieldName}:${JSON.stringify(args)}`

    const cached = cacheStore.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data
    }

    const result = await next()
    cacheStore.set(cacheKey, { data: result, timestamp: Date.now() })
    return result
  }

  // Only apply cache to queries by default
  middleware.operations = ["query"]

  return middleware
}
