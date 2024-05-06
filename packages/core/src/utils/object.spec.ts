import { describe, it, expect } from "vitest"
import { deepMerge } from "./object"

describe("deepMerge", () => {
  it("should return the first object when only one is provided", () => {
    const obj1 = { a: 1 }
    expect(deepMerge(obj1)).toEqual(obj1)
  })

  it("should merge two objects with no overlapping keys", () => {
    const obj1 = { a: 1 }
    const obj2 = { b: 2 }
    expect(deepMerge<any>(obj1, obj2)).toEqual({ a: 1, b: 2 })
  })

  it("should merge two objects with overlapping keys and basic values, preferring latter", () => {
    const obj1 = { a: 1, b: 2 }
    const obj2 = { b: 3, c: 4 }
    expect(deepMerge<any>(obj1, obj2)).toEqual({ a: 1, b: 3, c: 4 })
  })

  it("should deeply merge nested objects", () => {
    const obj1 = { a: { x: 1 } }
    const obj2 = { a: { y: 2 }, b: 3 }
    const expected = { a: { x: 1, y: 2 }, b: 3 }
    expect(deepMerge<any>(obj1, obj2)).toEqual(expected)
  })

  it("should merge arrays by concatenating them", () => {
    const obj1 = { a: [1, 2] }
    const obj2 = { a: [3, 4] }
    const expected = { a: [1, 2, 3, 4] }
    expect(deepMerge<any>(obj1, obj2)).toEqual(expected)
  })

  it("should handle merging an array with a non-array value by replacing it", () => {
    const obj1 = { a: [1, 2] }
    const obj2 = { a: 3 }
    expect(deepMerge<any>(obj1, obj2)).toEqual({ a: 3 })
  })

  it("should correctly handle merging when one of the objects is null or undefined", () => {
    const obj1 = { a: 1 }
    expect(deepMerge(obj1, null)).toEqual(obj1)
    expect(deepMerge(obj1, undefined)).toEqual(obj1)
  })

  it("should merge multiple objects correctly", () => {
    const obj1 = { a: 1 }
    const obj2 = { b: 2 }
    const obj3 = { a: 3, c: 4 }
    const expected = { a: 3, b: 2, c: 4 }
    expect(deepMerge<any>(obj1, obj2, obj3)).toEqual(expected)
  })
})
