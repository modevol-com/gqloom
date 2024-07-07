import { describe, expect, it } from "vitest"
import { asInputArgs } from "../src"

describe("asInputArgs", () => {
  it("should return asInputArgs", () => {
    const result = asInputArgs()
    expect(result).toMatchObject({
      type: "gqloom.asObjectType",
    })
  })

  it("should avoid duplication of name", () => {
    const a1 = asInputArgs()
    const a2 = asInputArgs()
    expect(a1.config.name).not.toEqual(a2.config.name)
  })
})
