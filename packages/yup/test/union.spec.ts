import { describe, it, expect } from "vitest"
import { number, object, string } from "yup"
import { union } from "../src/union"

describe("union", () => {
  const Cat = object({
    name: string().required(),
    color: string().required(),
  })
  const Dog = object({
    name: string().required(),
    height: number().required(),
  })
  it("should handle DEFAULT", () => {
    const Animal = union([Cat, Dog])
      .required()
      .default(() => {
        return {
          name: "Tom",
          color: "white",
        }
      })

    expect(Animal.validateSync(undefined)).toEqual({
      name: "Tom",
      color: "white",
    })
  })
  it("should type check", () => {
    const Animal = union([Cat, Dog, string()])
    expect(Animal.isType({ name: "Tom", color: "white" })).toBeTruthy()
    expect(Animal.isType({})).toBeTruthy()
    expect(Animal.isType("string")).toBeTruthy()
    expect(Animal.isType(1)).toBeFalsy()
    expect(Animal.isType([])).toBeFalsy()
    expect(Animal.isType(true)).toBeFalsy()
  })

  it("should find target schema", () => {
    const Animal = union([Cat, Dog])
    expect(Animal.findTargetSchemaSync({ name: "Tom", color: "white" })).toBe(
      Cat
    )
    expect(Animal.findTargetSchemaSync({ name: "Tom", height: 5 })).toBe(Dog)
    expect(Animal.findTargetSchemaSync({ name: "Tom" })).toBeUndefined()
  })

  it("should describe schema", () => {
    const Animal = union([Cat, Dog])
    expect(Animal.describe()).toMatchObject({
      type: "union",
      innerType: [
        {
          type: "object",
          fields: {
            name: { type: "string" },
            color: { type: "string" },
          },
        },
        {
          type: "object",
          fields: {
            name: { type: "string" },
            height: { type: "number" },
          },
        },
      ],
    })
  })

  describe("validate", () => {
    it("should validate", async () => {
      const Animal = union([Cat, Dog])
      expect(Animal.isValidSync({ name: "Tom", color: "white" })).toBeTruthy()
      expect(Animal.isValidSync({ name: "Tom", height: 5 })).toBeTruthy()
      expect(Animal.isValidSync({ name: "Tom" })).toBeFalsy()
    })

    it("should allow optional", () => {
      const Animal = union([Cat, Dog]).optional()
      expect(Animal.isValidSync(undefined)).toBeTruthy()
    })
  })
})
