import { describe, expect, it } from "vitest"
import {
  weaverContext,
  provideWeaverContext,
  initWeaverContext,
} from "./weaver-context"

describe("weaverContext", () => {
  it("should get context", () => {
    provideWeaverContext(() => {
      expect(weaverContext).toBeDefined()
      expect(weaverContext.inputMap).toBeDefined()
      expect(weaverContext.loomObjectMap).toBeDefined()
      expect(weaverContext.objectMap).toBeDefined()
      expect(weaverContext.enumMap).toBeDefined()
      expect(weaverContext.interfaceMap).toBeDefined()
      expect(weaverContext.unionMap).toBeDefined()
    }, initWeaverContext())
  })

  it("should get undefined if not in context", () => {
    expect(weaverContext.inputMap).toBeUndefined()
    expect(weaverContext.loomObjectMap).toBeUndefined()
    expect(weaverContext.objectMap).toBeUndefined()
    expect(weaverContext.enumMap).toBeUndefined()
    expect(weaverContext.interfaceMap).toBeUndefined()
    expect(weaverContext.unionMap).toBeUndefined()
  })

  it("should get different context in different provider", () => {
    let inputMap1: WeakMap<WeakKey, any> | undefined

    provideWeaverContext(() => {
      inputMap1 = weaverContext.inputMap
    }, initWeaverContext())

    provideWeaverContext(() => {
      expect(weaverContext.inputMap).not.toBe(inputMap1)
    }, initWeaverContext())
  })
})
