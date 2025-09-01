import { describe, expect, it } from "vitest"
import { isSubclass } from "../src/utils"

describe("isSubclass", () => {
  class Parent {}
  class Child extends Parent {}
  class GrandChild extends Child {}
  class Unrelated {}

  it("should return true for direct subclass", () => {
    expect(isSubclass(Child, Parent)).toBe(true)
  })

  it("should return true for indirect subclass", () => {
    expect(isSubclass(GrandChild, Parent)).toBe(true)
  })

  it("should return false for unrelated classes", () => {
    expect(isSubclass(Unrelated, Parent)).toBe(false)
  })

  it("should return false for the same class", () => {
    expect(isSubclass(Parent, Parent)).toBe(false)
  })

  it("should return false when parent is subclass of child", () => {
    expect(isSubclass(Parent, Child)).toBe(false)
  })
})
