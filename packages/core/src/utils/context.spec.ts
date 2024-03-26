import { describe, expect, it } from "vitest"
import {
  ContextMemory,
  ContextMemoryMapSymbol,
  createMemory,
  onlyMemory,
  resolverArgsStorage,
  useContext,
  useMemoryMap,
  useResolverArgs,
} from "./context"

describe("context", () => {
  describe("useResolverArgs", () => {
    it("should return undefined if no resolver args are set", () => {
      expect(useResolverArgs()).toBeUndefined()
    })

    it("should return the resolver args", () => {
      const args = {} as any
      resolverArgsStorage.run(args, () => {
        expect(useResolverArgs()).toBe(args)
      })
    })

    it("should return undefined if only memory args are set", () => {
      resolverArgsStorage.run(onlyMemory(), () => {
        expect(useResolverArgs()).toBeUndefined()
      })
    })
  })

  describe("useContext", () => {
    it("should return undefined if no context is set", () => {
      expect(useContext()).toBeUndefined()
    })

    it("should return the context", () => {
      const args = { context: {} } as any
      resolverArgsStorage.run(args, () => {
        expect(useContext()).toBe(args.context)
      })
    })

    it("should return undefined if only memory args are set", () => {
      resolverArgsStorage.run(onlyMemory(), () => {
        expect(useContext()).toBeUndefined()
      })
    })

    it("should be same context in useContext and useResolverArgs", () => {
      const args = { context: {} } as any
      resolverArgsStorage.run(args, () => {
        expect(useContext()).toBe(useResolverArgs()?.context)
      })
    })
  })
})

describe("memory", () => {
  describe("ContextMemory", () => {
    it("should be called many times without context", () => {
      let times = 0
      const memory = new ContextMemory(() => {
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
      const memory = new ContextMemory(() => {
        times++
        return "🥭mango"
      })
      resolverArgsStorage.run(onlyMemory(), () => {
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
      const memory = new ContextMemory(async () => {
        times++
        await new Promise((resolve) => setTimeout(resolve, 6))
        return "🥭mango"
      })

      resolverArgsStorage.run(onlyMemory(), async () => {
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
      const memory = new ContextMemory(async () => {
        times++
        await new Promise((resolve) => setTimeout(resolve, 6))
        return "🥭mango"
      })

      resolverArgsStorage.run(onlyMemory(), async () => {
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
      const memory = new ContextMemory(() => {
        times++
        return "🥭mango"
      })

      resolverArgsStorage.run(onlyMemory(), () => {
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
      const useFruit = createMemory(() => "🍌banana")
      expect(typeof useFruit).toBe("function")
      expect(useFruit()).toEqual("🍌banana")
      expect(useFruit.get()).toEqual("🍌banana")

      expect(useFruit.exists()).toEqual(undefined)
      expect(useFruit.clear()).toEqual(undefined)

      resolverArgsStorage.run(onlyMemory(), () => {
        expect(useFruit.exists()).toEqual(false)
        expect(useFruit.clear()).toEqual(false)
      })
    })
  })

  describe("useMemoryMap", () => {
    it("should return undefined if no memory map is set", () => {
      expect(useMemoryMap()).toBeUndefined()
    })

    it("should return the memory map", () => {
      const map = new WeakMap()
      const args = { context: { [ContextMemoryMapSymbol]: map } } as any

      resolverArgsStorage.run(args, () => {
        expect(useMemoryMap()).toBe(map)
      })
    })

    it("should return the memory map from the context", () => {
      const args = { context: {} } as any
      resolverArgsStorage.run(args, () => {
        expect(useMemoryMap()).toBe(args.context[ContextMemoryMapSymbol])
      })
    })

    it("should return the memory map from the only memory args", () => {
      const memory = onlyMemory()
      resolverArgsStorage.run(memory, () => {
        expect(useMemoryMap()).toBe(memory.memory)
      })
    })
  })

  describe("onlyMemory", () => {
    it("should return the memory args", () => {
      const memory = onlyMemory()
      expect(memory).toEqual({ memory: new WeakMap(), isMemory: true })
    })
  })
})
