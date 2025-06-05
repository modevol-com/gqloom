import {
  GraphQLFloat,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from "graphql"
import { describe, expect, it } from "vitest"
import { createInputParser, getStandardValue, parseInputValue } from "./input"
import { silk } from "./silk"

describe("parseInput", () => {
  it("should parse undefined", async () => {
    expect(await parseInputValue(undefined, undefined)).toEqual({
      value: undefined,
    })
    expect(await parseInputValue(undefined, 1)).toEqual({ value: 1 })
    expect(await parseInputValue(undefined, "abc")).toEqual({ value: "abc" })
    expect(await parseInputValue(undefined, {})).toEqual({ value: {} })
  })

  describe("should parse Silk", () => {
    const Giraffe = silk<IGiraffe, Partial<IGiraffe>>(
      new GraphQLObjectType({
        name: "Giraffe",
        fields: {
          name: { type: new GraphQLNonNull(GraphQLString) },
          birthday: { type: new GraphQLNonNull(GraphQLString) },
          heightInMeters: { type: new GraphQLNonNull(GraphQLFloat) },
        },
      }),
      async ({
        name = "Tallulah",
        birthday = new Date(),
        heightInMeters = 1.5,
      } = {}) => {
        if (name.length > 10) return { issues: [{ message: "Name too long" }] }
        return { value: { name, birthday, heightInMeters } }
      }
    )
    it("should accept undefined", async () => {
      const output1 = await parseInputValue(Giraffe, undefined)
      if (!("value" in output1)) throw new Error("parse failed")
      expect(output1.value.name).toBe("Tallulah")
      expect(output1.value.birthday).toBeInstanceOf(Date)
      expect(output1.value.heightInMeters).toBe(1.5)
    })

    it("should accept partial", async () => {
      const Twiga: IGiraffe = {
        name: "Twiga",
        birthday: new Date(),
        heightInMeters: 1.5,
      }

      expect(getStandardValue(await parseInputValue(Giraffe, Twiga))).toEqual(
        Twiga
      )
    })

    it("should throw errors", async () => {
      const nameVeryLong = "this is a very long name, and it should fail"
      expect(
        await parseInputValue(Giraffe, { name: nameVeryLong })
      ).toMatchObject({
        issues: [{ message: "Name too long" }],
      })
    })
  })

  describe("should parse Record", async () => {
    const Giraffe = {
      name: silk<string, string | undefined>(
        GraphQLString,
        async (input = "Twiga") => {
          if (input.length > 10)
            return { issues: [{ message: "Name too long" }] }
          return { value: input }
        }
      ),
      birthday: silk<Date, Date | undefined>(
        GraphQLString,
        async (input = new Date()) => {
          await new Promise((resolve) => setTimeout(resolve, 6))
          return { value: input }
        }
      ),
      heightInMeters: silk<number, number | undefined>(
        GraphQLFloat,
        (input = 1.5) => ({ value: input })
      ),
    }

    it("should accept undefined", async () => {
      const output1 = await parseInputValue(Giraffe, undefined)
      if (!("value" in output1)) throw new Error("parse failed")
      expect(output1.value.name).toBe("Twiga")
      expect(output1.value.birthday).toBeInstanceOf(Date)
      expect(output1.value.heightInMeters).toBe(1.5)
    })

    it("should accept partial", async () => {
      const Twiga: IGiraffe = {
        name: "Twiga",
        birthday: new Date(),
        heightInMeters: 1.5,
      }
      expect(await parseInputValue(Giraffe, Twiga)).toEqual({ value: Twiga })
    })

    it("should get issues", async () => {
      const nameVeryLong = "this is a very long name, and it should fail"
      expect(
        await parseInputValue(Giraffe, { name: nameVeryLong })
      ).toMatchObject({
        issues: [{ message: "Name too long" }],
      })
    })
  })
})

describe("CallableInputParser", () => {
  it("should parse input", async () => {
    const parseInput = createInputParser(
      { count: silk(GraphQLInt) },
      { count: 1 }
    )
    const result = await parseInput()

    expect(result).toEqual({ value: { count: 1 } })
  })

  it("should cache result", async () => {
    const parseInput = createInputParser(
      { count: silk(GraphQLInt) },
      { count: 1 }
    )

    const result = await parseInput()
    const result2 = await parseInput()
    expect(result).toBe(result2)
  })

  it("should parse once", async () => {
    let parseTime = 0
    const parseInput = createInputParser(
      {
        count: silk(GraphQLInt, (n) => {
          parseTime++
          return { value: n }
        }),
      },
      { count: 1 }
    )
    await parseInput()
    await parseInput()
    await parseInput()
    expect(parseTime).toBe(1)
  })

  it("should be able to set result", async () => {
    const parseInput = createInputParser(
      { count: silk(GraphQLInt) },
      { count: 1 }
    )
    await parseInput()
    expect(parseInput.result).toEqual({ value: { count: 1 } })
    parseInput.setResult({ count: 2 })
    expect(parseInput.result).toEqual({ value: { count: 2 } })
    await parseInput()
    expect(parseInput.result).toEqual({ value: { count: 2 } })

    parseInput.result = { value: { count: 3 } }
    await parseInput()
    expect(parseInput.result).toEqual({ value: { count: 3 } })
  })

  it("should be able to clear cache", async () => {
    let parseTime = 0
    const parseInput = createInputParser(
      {
        count: silk(GraphQLInt, (n) => {
          parseTime++
          return { value: n }
        }),
      },
      { count: 1 }
    )
    await parseInput()
    await parseInput()
    await parseInput()
    expect(parseTime).toBe(1)

    parseInput.result = undefined
    await parseInput()
    await parseInput()
    expect(parseTime).toBe(2)

    parseInput.result = undefined
    await parseInput()
    expect(parseTime).toBe(3)

    parseInput.clearResult()
    await parseInput()
    expect(parseTime).toBe(4)
  })
})

describe("getStandardValue", () => {
  it("should return the value when result is successful", () => {
    const result = { value: "valid value" }
    expect(getStandardValue(result)).toBe("valid value")
  })

  it("should throw GraphQLError when result has issues", () => {
    const result = { issues: [{ message: "Invalid args" }] }
    expect(() => getStandardValue(result)).toThrowError(`Invalid args`)
    const result2 = { issues: [{}] } as any
    expect(() => getStandardValue(result2)).toThrowError(`Invalid input`)
  })

  it("should return undefined when result is undefined", () => {
    expect(getStandardValue(undefined)).toBeUndefined()
  })

  it("should return null when result is null", () => {
    expect(getStandardValue(null)).toBeNull()
  })

  it("should throw GraphQLError when result does not have value and no issues", () => {
    const result = {} as any
    expect(() => getStandardValue(result)).toThrowError(`Invalid input`)
  })
})

interface IGiraffe {
  name: string
  birthday: Date
  heightInMeters: number
}
