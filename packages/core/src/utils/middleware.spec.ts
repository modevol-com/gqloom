import { AsyncLocalStorage } from "node:async_hooks"
import { describe, expect, it } from "vitest"
import {
  type Middleware,
  applyMiddlewares,
  type MiddlewarePayload,
} from "./middleware"
import { createInputParser } from "../resolver"

function initPayload(): MiddlewarePayload {
  return {
    parent: undefined,
    parseInput: createInputParser(undefined, undefined),
  }
}

describe("middleware", async () => {
  it("should work", async () => {
    const simpleMiddleware: Middleware = (next) => next()
    const answer = Math.random()
    const result = await applyMiddlewares(
      [simpleMiddleware],
      () => answer,
      initPayload()
    )
    expect(result).toBe(answer)
  })

  it("should be called in order", async () => {
    const results: string[] = []
    const middlewares: Middleware[] = [
      (next) => {
        results.push("A Start")
        const result = next()
        results.push("A end")
        return result
      },
      (next) => {
        results.push("B Start")
        const result = next()
        results.push("B end")
        return result
      },
      (next) => {
        results.push("C Start")
        const result = next()
        results.push("C end")
        return result
      },
    ]
    const resolve = () => {
      results.push("Resolve")
      return "resolved"
    }
    await applyMiddlewares(middlewares, resolve, initPayload())
    expect(results).toEqual([
      "A Start",
      "B Start",
      "C Start",
      "Resolve",
      "C end",
      "B end",
      "A end",
    ])
  })

  it("should be able to modify the resolve value", async () => {
    const middlewares: Middleware[] = [
      async (next) => {
        const value = await next()
        return value + 1
      },
      async (next) => {
        const value = await next()
        return value + 2
      },
      async (next) => {
        const value = await next()
        return value + 3
      },
    ]
    const resolve = () => 0
    const result = await applyMiddlewares(middlewares, resolve, initPayload())
    expect(result).toBe(6)
  })

  it("should work with AsyncLocalStorage", async () => {
    const asyncLocalStorage = new AsyncLocalStorage<{ cat: string }>()
    const provideCat: Middleware = (next) => {
      return asyncLocalStorage.run({ cat: "meow" }, next)
    }

    const consumeCat: Middleware = (next) => {
      const cat = asyncLocalStorage.getStore()?.cat
      expect(cat).toBe("meow")
      return next()
    }

    const result = await applyMiddlewares(
      [provideCat, consumeCat],
      () => {
        return asyncLocalStorage.getStore()?.cat
      },
      initPayload()
    )

    expect(result).toBe("meow")
  })
})
