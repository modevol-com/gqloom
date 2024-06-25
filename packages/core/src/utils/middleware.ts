import type { MayPromise } from "./types"

// TODO: enhance ResolveResult type
type ResolveResult = any

export interface MiddlewarePayload {}

export type Middleware = (
  next: () => MayPromise<ResolveResult>
) => MayPromise<ResolveResult>

export function applyMiddlewares(
  middlewares: Middleware[],
  resolveFunction: () => MayPromise<ResolveResult>
): Promise<ResolveResult> {
  const next = async (index: number): Promise<unknown> => {
    if (index >= middlewares.length) {
      return resolveFunction()
    }
    const middleware = middlewares[index]
    return middleware.call({ foo: "woo" }, () => next(index + 1))
  }
  return next(0)
}

export function compose<T>(...lists: (T[] | undefined)[]): T[] {
  const list: T[] = []
  for (const item of lists) {
    if (item != null) {
      list.push(...item)
    }
  }
  return list
}
