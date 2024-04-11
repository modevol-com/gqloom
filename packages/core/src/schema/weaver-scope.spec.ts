import { describe, expect, it } from "vitest"
import { weaverScope, provideWeaverScope, initScope } from "./weaver-scope"

describe("weaverScope", () => {
  it("should get scope", () => {
    provideWeaverScope(() => {
      expect(weaverScope).toBeDefined()
      expect(weaverScope.inputMap).toBeDefined()
      expect(weaverScope.objectMap).toBeDefined()
      expect(weaverScope.enumMap).toBeDefined()
      expect(weaverScope.interfaceMap).toBeDefined()
      expect(weaverScope.unionMap).toBeDefined()
    }, initScope())
  })

  it("should get undefined if not in scope", () => {
    expect(weaverScope.inputMap).toBeUndefined()
    expect(weaverScope.objectMap).toBeUndefined()
    expect(weaverScope.enumMap).toBeUndefined()
    expect(weaverScope.interfaceMap).toBeUndefined()
    expect(weaverScope.unionMap).toBeUndefined()
  })

  it("should get different scope in different provider", () => {
    let inputMap1: WeakMap<WeakKey, any> | undefined

    provideWeaverScope(() => {
      inputMap1 = weaverScope.inputMap
    }, initScope())

    provideWeaverScope(() => {
      expect(weaverScope.inputMap).not.toBe(inputMap1)
    }, initScope())
  })
})
