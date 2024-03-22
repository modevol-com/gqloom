import { it, describe, expect } from "vitest"
import { applyMiddlewares, type Middleware } from "./middleware"
import { AsyncLocalStorage } from "node:async_hooks"

describe("middleware", async () => {
	it("should work", async () => {
		const simpleMiddleware: Middleware = (next) => next()
		const answer = Math.random()
		const result = await applyMiddlewares([simpleMiddleware], () => answer)
		expect(result).toBe(answer)
	})

	it("should call middlewares in order", async () => {
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
		await applyMiddlewares(middlewares, resolve)
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
		const result = await applyMiddlewares(middlewares, resolve)
		expect(result).toBe(6)
	})

	it("should work with AsyncLocalStorage", async () => {
		const asyncLocalStorage = new AsyncLocalStorage<{ cat: string }>()
		const catProvider: Middleware = (next) => {
			return asyncLocalStorage.run({ cat: "meow" }, next)
		}

		const catMiddleware: Middleware = (next) => {
			const cat = asyncLocalStorage.getStore()?.cat
			expect(cat).toBe("meow")
			return next()
		}

		const result = await applyMiddlewares([catProvider, catMiddleware], () => {
			const cat = asyncLocalStorage.getStore()?.cat
			return cat
		})

		expect(result).toBe("meow")
	})
})
