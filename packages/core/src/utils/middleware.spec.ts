import { AsyncLocalStorage } from "node:async_hooks"
import { GraphQLString } from "graphql"
import { describe, expect, it } from "vitest"
import { createInputParser, silk } from "../resolver"
import {
  type Middleware,
  type MiddlewareOptions,
  applyMiddlewares,
} from "./middleware"

function initOptions(): MiddlewareOptions {
  return {
    outputSilk: silk(GraphQLString),
    parent: undefined,
    parseInput: createInputParser(undefined, undefined),
    operation: "field",
    payload: undefined,
  }
}

describe("middleware", async () => {
  it("should work", async () => {
    const simpleMiddleware: Middleware = (next) => next()
    const answer = Math.random()
    const result = await applyMiddlewares(
      initOptions(),
      () => answer,
      simpleMiddleware
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
    await applyMiddlewares(initOptions(), resolve, middlewares)
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
    const result = await applyMiddlewares(initOptions(), resolve, middlewares)
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
      initOptions(),
      () => {
        return asyncLocalStorage.getStore()?.cat
      },
      provideCat,
      consumeCat
    )

    expect(result).toBe("meow")
  })

  it("should filter middlewares based on operations", async () => {
    const results: string[] = []

    // Middleware that only handles query operations
    const queryMiddleware: Middleware = function (options) {
      results.push("query middleware")
      return options.next()
    }
    queryMiddleware.operations = ["query"]

    // Middleware that only handles mutation operations
    const mutationMiddleware: Middleware = function (options) {
      results.push("mutation middleware")
      return options.next()
    }
    mutationMiddleware.operations = ["mutation"]

    // Middleware that handles all operations by default
    const defaultMiddleware: Middleware = function (options) {
      results.push("default middleware")
      return options.next()
    }

    // Test query operation
    results.length = 0
    await applyMiddlewares(
      { ...initOptions(), operation: "query" },
      () => "query result",
      queryMiddleware,
      mutationMiddleware,
      defaultMiddleware
    )
    expect(results).toEqual(["query middleware", "default middleware"])

    // Test mutation operation
    results.length = 0
    await applyMiddlewares(
      { ...initOptions(), operation: "mutation" },
      () => "mutation result",
      queryMiddleware,
      mutationMiddleware,
      defaultMiddleware
    )
    expect(results).toEqual(["mutation middleware", "default middleware"])

    // Test field operation (should only execute default middleware)
    results.length = 0
    await applyMiddlewares(
      { ...initOptions(), operation: "field" },
      () => "field result",
      queryMiddleware,
      mutationMiddleware,
      defaultMiddleware
    )
    expect(results).toEqual(["default middleware"])
  })
})
