import { describe, expect, it } from "vitest"
import { parseFieldConfig, parseObjectConfig } from "../../src/v3/utils"

describe("parseObjectConfig", () => {
  it("should parse name", () => {
    expect(parseObjectConfig("name")).toMatchObject({
      name: "name",
      description: undefined,
    })

    expect(parseObjectConfig("abc")).toMatchObject({
      name: "abc",
      description: undefined,
    })
  })

  it("should parse description", () => {
    expect(parseObjectConfig("name: description")).toMatchObject({
      name: "name",
      description: "description",
    })

    expect(
      parseObjectConfig("name: description maybe very long")
    ).toMatchObject({
      name: "name",
      description: "description maybe very long",
    })
  })
})

describe("parseFieldConfig", () => {
  it("should parse description", () => {
    expect(parseFieldConfig("description maybe:: very long")).toMatchObject({
      description: "description maybe:: very long",
    })
  })
})
