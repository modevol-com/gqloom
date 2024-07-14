import { describe, it, expect } from "vitest"
import { parseObjectConfig, parseFieldConfig } from "../src/utils"

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
