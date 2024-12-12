import { describe, expect, it } from "vitest"
import {
  ContextMemoization,
  createMemoization,
  onlyMemoization,
  resolverPayloadStorage,
  useContext,
  useMemoizationMap,
  useResolverPayload,
} from "./context"
import { CONTEXT_MEMORY_MAP_KEY } from "./symbols"

describe("context", () => {
  describe("useResolverArgs", () => {
    it("should return undefined if no resolver args are set", () => {
      expect(useResolverPayload()).toBeUndefined()
    })

    it("should return the resolver args", () => {
      const args = {} as any
      resolverPayloadStorage.run(args, () => {
        expect(useResolverPayload()).toBe(args)
      })
    })

    it("should return undefined if only memory args are set", () => {
      resolverPayloadStorage.run(onlyMemoization(), () => {
        expect(useResolverPayload()).toBeUndefined()
      })
    })
  })

  describe("useContext", () => {
    it("should return undefined if no context is set", () => {
      expect(useContext()).toBeUndefined()
    })

    it("should return the context", () => {
      const args = { context: {} } as any
      resolverPayloadStorage.run(args, () => {
        expect(useContext()).toBe(args.context)
      })
    })

    it("should return undefined if only memory args are set", () => {
      resolverPayloadStorage.run(onlyMemoization(), () => {
        expect(useContext()).toBeUndefined()
      })
    })

    it("should be same context in useContext and useResolverArgs", () => {
      const args = { context: {} } as any
      resolverPayloadStorage.run(args, () => {
        expect(useContext()).toBe(useResolverPayload()?.context)
      })
    })
  })
})

describe("memory", () => {
  describe("ContextMemory", () => {
    it("should be called many times without context", () => {
      let times = 0
      const memory = new ContextMemoization(() => {
        times++
        return "🥭mango"
      })

      expect(times).toEqual(0)
      expect(memory.get()).toEqual("🥭mango")
      expect(times).toEqual(1)
      expect(memory.get()).toEqual("🥭mango")
      expect(times).toEqual(2)
      expect(memory.get()).toEqual("🥭mango")
      expect(times).toEqual(3)
    })

    it("should be called only one time with context", () => {
      let times = 0
      const memory = new ContextMemoization(() => {
        times++
        return "🥭mango"
      })
      resolverPayloadStorage.run(onlyMemoization(), () => {
        expect(times).toEqual(0)
        expect(memory.get()).toEqual("🥭mango")
        expect(times).toEqual(1)
        expect(memory.get()).toEqual("🥭mango")
        expect(times).toEqual(1)
        expect(memory.get()).toEqual("🥭mango")
        expect(times).toEqual(1)
      })
    })

    it("should work with async function", async () => {
      let times = 0
      const memory = new ContextMemoization(async () => {
        times++
        await new Promise((resolve) => setTimeout(resolve, 6))
        return "🥭mango"
      })

      resolverPayloadStorage.run(onlyMemoization(), async () => {
        expect(times).toEqual(0)
        expect(await memory.get()).toEqual("🥭mango")
        expect(times).toEqual(1)
        expect(await memory.get()).toEqual("🥭mango")
        expect(times).toEqual(1)
        expect(await memory.get()).toEqual("🥭mango")
        expect(times).toEqual(1)
      })
    })

    it("should be able to clear", async () => {
      let times = 0
      const memory = new ContextMemoization(async () => {
        times++
        await new Promise((resolve) => setTimeout(resolve, 6))
        return "🥭mango"
      })

      resolverPayloadStorage.run(onlyMemoization(), async () => {
        expect(times).toEqual(0)
        expect(await memory.get()).toEqual("🥭mango")
        expect(times).toEqual(1)
        expect(await memory.get()).toEqual("🥭mango")
        expect(times).toEqual(1)
        expect(memory.exists()).toEqual(true)
        expect(memory.clear()).toEqual(true)
        expect(memory.exists()).toEqual(false)
        expect(await memory.get()).toEqual("🥭mango")
        expect(memory.exists()).toEqual(true)
        expect(times).toEqual(2)
      })
    })

    it("should be able to set", async () => {
      let times = 0
      const memory = new ContextMemoization(() => {
        times++
        return "🥭mango"
      })
      expect(() => memory.set("🍌banana")).not.throw()
      resolverPayloadStorage.run(onlyMemoization(), () => {
        expect(times).toEqual(0)
        expect(memory.get()).toEqual("🥭mango")
        expect(times).toEqual(1)
        expect(memory.get()).toEqual("🥭mango")
        expect(times).toEqual(1)
        expect(memory.exists()).toEqual(true)
        memory.set("🍌banana")
        expect(memory.exists()).toEqual(true)
        expect(memory.get()).toEqual("🍌banana")
        expect(times).toEqual(1)
      })
    })
  })

  describe("createMemory", () => {
    it("should create a callable memory object", () => {
      const useFruit = createMemoization(() => "🍌banana")
      expect(typeof useFruit).toBe("function")
      expect(useFruit()).toEqual("🍌banana")
      expect(useFruit.get()).toEqual("🍌banana")

      expect(useFruit.exists()).toEqual(undefined)
      expect(useFruit.clear()).toEqual(undefined)

      resolverPayloadStorage.run(onlyMemoization(), () => {
        expect(useFruit.exists()).toEqual(false)
        expect(useFruit.clear()).toEqual(false)
      })
    })
  })

  describe("useMemoryMap", () => {
    it("should return undefined if no memory map is set", () => {
      expect(useMemoizationMap()).toBeUndefined()
    })

    it("should return the memory map", () => {
      const map = new WeakMap()
      const args = { context: { [CONTEXT_MEMORY_MAP_KEY]: map } } as any

      resolverPayloadStorage.run(args, () => {
        expect(useMemoizationMap()).toBe(map)
      })
    })

    it("should return the memory map from the context", () => {
      const args = { context: {} } as any
      resolverPayloadStorage.run(args, () => {
        expect(useMemoizationMap()).toBe(args.context[CONTEXT_MEMORY_MAP_KEY])
      })
    })

    it("should return the memory map from the only memory args", () => {
      const memory = onlyMemoization()
      resolverPayloadStorage.run(memory, () => {
        expect(useMemoizationMap()).toBe(memory.memoization)
      })
    })
  })

  describe("onlyMemory", () => {
    it("should return the memory args", () => {
      const memory = onlyMemoization()
      expect(memory).toEqual({
        memoization: new WeakMap(),
        isMemoization: true,
      })
    })
  })
})
