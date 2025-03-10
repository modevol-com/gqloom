import { describe, expect, it } from "vitest"
import { WEAVER_CONFIG } from "../utils/symbols"
import type { SchemaWeaver } from "./schema-weaver"
import {
  collectName,
  collectNames,
  initWeaverContext,
  provideWeaverContext,
  weaverContext,
} from "./weaver-context"

describe("weaverContext", () => {
  it("should get context", () => {
    provideWeaverContext(() => {
      expect(weaverContext).toBeDefined()
      expect(weaverContext.id).toBeDefined()
      expect(weaverContext.inputMap).toBeDefined()
      expect(weaverContext.loomUnionMap).toBeDefined()
      expect(weaverContext.loomObjectMap).toBeDefined()
      expect(weaverContext.interfaceMap).toBeDefined()
    }, initWeaverContext())
  })

  it("should get undefined if not in context", () => {
    expect(weaverContext.inputMap).toBeUndefined()
    expect(weaverContext.loomObjectMap).toBeUndefined()
    expect(weaverContext.interfaceMap).toBeUndefined()
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

  it("should be able to get, set and delete config", () => {
    const context = initWeaverContext()

    provideWeaverContext(() => {
      const config = {
        [WEAVER_CONFIG]: "testConfig",
        vendorWeaver: {} as SchemaWeaver,
      }

      weaverContext.setConfig(config)

      const retrievedConfig =
        weaverContext.getConfig<typeof config>("testConfig")
      expect(retrievedConfig).toEqual(config)

      weaverContext.deleteConfig("testConfig")

      const deletedConfig = weaverContext.getConfig<typeof config>("testConfig")
      expect(deletedConfig).toBeUndefined()
    }, context)
  })

  it("should collect names", () => {
    const schema1 = {}
    const schema2 = {}
    const schema3 = {}

    provideWeaverContext(() => {
      collectName("schema1", schema1)

      expect(weaverContext.names.get(schema1)).toBe("schema1")

      collectNames({ schema2, schema3 })

      expect(weaverContext.names.get(schema2)).toBe("schema2")
      expect(weaverContext.names.get(schema3)).toBe("schema3")
    }, initWeaverContext())
  })
})
