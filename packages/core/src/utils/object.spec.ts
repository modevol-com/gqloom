import { GraphQLInt, GraphQLString } from "graphql"
import { describe, expect, it } from "vitest"
import { deepMerge, toArguments, toFieldMap, toObjMap } from "./object"

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

describe("toObjMap", () => {
  it("should return an empty object when input is null", () => {
    expect(toObjMap(null)).toEqual(Object.create(null))
  })

  it("should return an empty object when input is undefined", () => {
    expect(toObjMap(undefined)).toEqual(Object.create(null))
  })

  it("should return the input object if its prototype is null", () => {
    const obj = Object.create(null)
    obj["key"] = "value"
    expect(toObjMap(obj)).toBe(obj)
  })

  it("should create a new object with the same key-value pairs when input has a prototype", () => {
    const obj = { key: "value" }
    const result = toObjMap(obj)
    expect(result).not.toBe(obj)
    expect(result).toEqual({ key: "value" })
  })
})

describe("toArguments", () => {
  it("should convert argument config map to array", () => {
    const args = {
      name: {
        type: GraphQLString,
        description: "The name",
      },
      age: {
        type: GraphQLInt,
        defaultValue: 0,
      },
    }

    const result = toArguments(args)

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      name: "name",
      type: GraphQLString,
      description: "The name",
    })
    expect(result[1]).toMatchObject({
      name: "age",
      type: GraphQLInt,
      defaultValue: 0,
    })
  })

  it("should handle empty map", () => {
    const result = toArguments({})
    expect(result).toHaveLength(0)
  })

  it("should handle optional fields", () => {
    const args = {
      name: {
        type: GraphQLString,
      },
    }

    const result = toArguments(args)

    expect(result[0]).toMatchObject({
      name: "name",
      type: GraphQLString,
      description: undefined,
      defaultValue: undefined,
      deprecationReason: undefined,
    })
  })
})

describe("toFieldMap", () => {
  it("should convert field config map to field map", () => {
    const fields = {
      name: {
        type: GraphQLString,
        description: "The name field",
        args: {
          prefix: {
            type: GraphQLString,
          },
        },
      },
      age: {
        type: GraphQLInt,
      },
    }

    const result = toFieldMap(fields)

    expect(result.name).toMatchObject({
      name: "name",
      type: GraphQLString,
      description: "The name field",
    })
    expect(result.name.args).toHaveLength(1)
    expect(result.name.args[0].name).toBe("prefix")

    expect(result.age).toMatchObject({
      name: "age",
      type: GraphQLInt,
    })
    expect(result.age.args).toHaveLength(0)
  })

  it("should handle empty map", () => {
    const result = toFieldMap({})
    expect(Object.keys(result)).toHaveLength(0)
  })

  it("should handle optional fields", () => {
    const fields = {
      name: {
        type: GraphQLString,
      },
    }

    const result = toFieldMap(fields)

    expect(result.name).toMatchObject({
      name: "name",
      type: GraphQLString,
      description: undefined,
      deprecationReason: undefined,
      resolve: undefined,
      subscribe: undefined,
    })
  })
})
