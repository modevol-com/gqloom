import { AsyncLocalStorage } from "node:async_hooks"
import { describe, expect, it } from "vitest"
import { bindAsyncIterator } from "./async-iterator"

describe("bindAsyncIterator", () => {
  it("should bind async iterator to AsyncLocalStorage", async () => {
    const storage = new AsyncLocalStorage<number>()
    let contextValue: number | undefined

    async function* testGenerator() {
      contextValue = storage.getStore()
      yield 1
      yield 2
      return 3
    }

    await storage.run(42, async () => {
      const boundGenerator = bindAsyncIterator(storage, testGenerator())

      const result1 = await boundGenerator.next()
      expect(result1.value).toBe(1)
      expect(contextValue).toBe(42)

      const result2 = await boundGenerator.next()
      expect(result2.value).toBe(2)
      expect(contextValue).toBe(42)

      const result3 = await boundGenerator.next()
      expect(result3.value).toBe(3)
      expect(result3.done).toBe(true)
    })
  })

  it("should handle generator return", async () => {
    const storage = new AsyncLocalStorage<number>()
    let contextValue: number | undefined

    let executed = false
    async function* testGenerator() {
      contextValue = storage.getStore()
      executed = true
      yield 1
      return 2
    }

    const boundGenerator = bindAsyncIterator(storage, testGenerator())

    await storage.run(42, async () => {
      const result = await boundGenerator.return(3)
      expect(result.value).toBe(3)
      expect(result.done).toBe(true)

      expect(storage.getStore()).toBe(42)
      expect(executed).toBe(false)
      expect(contextValue).toBe(undefined)
    })
  })

  it("should handle generator throw", async () => {
    const storage = new AsyncLocalStorage<number>()
    let contextValue: number | undefined

    async function* testGenerator() {
      contextValue = storage.getStore()
      yield 1
      throw new Error("test error")
    }

    await storage.run(42, async () => {
      const boundGenerator = bindAsyncIterator(storage, testGenerator())
      const result = await boundGenerator.next()
      expect(result.value).toBe(1)
      expect(contextValue).toBe(42)

      await expect(
        boundGenerator.throw(new Error("test error"))
      ).rejects.toThrow("test error")
    })
  })

  it("should work with for await...of", async () => {
    const storage = new AsyncLocalStorage<number>()
    const values: number[] = []

    async function* testGenerator() {
      yield 1
      yield 2
      yield 3
    }

    const boundGenerator = bindAsyncIterator(storage, testGenerator())

    await storage.run(42, async () => {
      for await (const value of boundGenerator) {
        values.push(value)
      }
    })

    expect(values).toEqual([1, 2, 3])
  })
})
