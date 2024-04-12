import { describe, expect, it } from "vitest"
import { markLocation, tryIn } from "./error"

describe("markLocation", () => {
  it("should mark location", () => {
    expect(markLocation("error", "banana")).toEqual("[banana] error")
  })

  it("should not effect message when location is empty", () => {
    expect(markLocation("error")).toEqual("error")
  })

  it("should mark location with multiple locations", () => {
    expect(markLocation("error", "banana", "apple")).toEqual(
      "[banana.apple] error"
    )
  })

  it("should mark location for message with location", () => {
    expect(markLocation("[banana] error", "apple")).toEqual(
      "[apple.banana] error"
    )
    expect(markLocation("[banana] error", "apple", "orange")).toEqual(
      "[apple.orange.banana] error"
    )
    expect(markLocation("[apple.banana] error", "orange")).toEqual(
      "[orange.apple.banana] error"
    )
    expect(markLocation("[apple.banana] error", "orange", "peach")).toEqual(
      "[orange.peach.apple.banana] error"
    )
  })
})

describe("tryIn", () => {
  it("should return value when no error", () => {
    expect(tryIn(() => 1, "banana")).toEqual(1)
  })
  it("should throw error when error", () => {
    expect(() =>
      tryIn(() => {
        throw new Error("error")
      }, "banana")
    ).toThrow("[banana] error")
  })
})
