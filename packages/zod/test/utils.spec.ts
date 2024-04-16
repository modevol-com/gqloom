import { describe, it, expect } from "vitest"
import { parseObjectConfig, parseFieldConfig } from "../src/utils"
import { directives } from "@gqloom/core"

describe("parseObjectConfig", () => {
  it("should parse name", () => {
    expect(parseObjectConfig("name")).toMatchObject({
      name: "name",
      description: undefined,
      extensions: undefined,
    })

    expect(parseObjectConfig("abc")).toMatchObject({
      name: "abc",
      description: undefined,
      extensions: undefined,
    })
  })

  it("should parse description", () => {
    expect(parseObjectConfig("name: description")).toMatchObject({
      name: "name",
      description: "description",
      extensions: undefined,
    })

    expect(
      parseObjectConfig("name: description maybe very long")
    ).toMatchObject({
      name: "name",
      description: "description maybe very long",
      extensions: undefined,
    })
  })

  it("should parse directives", () => {
    expect(parseObjectConfig("name @directive")).toMatchObject({
      extensions: directives("@directive"),
    })

    expect(parseObjectConfig("@directive name")).toMatchObject({
      extensions: directives("@directive"),
    })

    expect(parseObjectConfig('name @directive1(value: "woo")')).toMatchObject({
      extensions: directives('@directive1(value: "woo")'),
    })

    expect(
      parseObjectConfig('name @directive1(value: "woo") @directive2')
    ).toMatchObject({
      extensions: directives('@directive1(value: "woo")', "@directive2"),
    })

    expect(
      parseObjectConfig('@directive1(value: "woo") name @directive2')
    ).toMatchObject({
      extensions: directives('@directive1(value: "woo")', "@directive2"),
    })
  })

  it("should parse description and directives", () => {
    expect(
      parseObjectConfig(
        '@directive1(value: "woo") name @directive2: description maybe:: very long'
      )
    ).toMatchObject({
      name: "name",
      description: "description maybe:: very long",
      extensions: directives('@directive1(value: "woo")', "@directive2"),
    })
  })
})

describe("parseFieldConfig", () => {
  it("should parse description", () => {
    expect(parseFieldConfig("description maybe:: very long")).toMatchObject({
      description: "description maybe:: very long",
      extensions: undefined,
    })
  })

  it("should parse description and directives", () => {
    expect(
      parseFieldConfig(
        '@directive1(value: "woo") @directive2 description maybe:: very long'
      )
    ).toMatchObject({
      description: "description maybe:: very long",
      extensions: directives('@directive1(value: "woo")', "@directive2"),
    })
  })
})
