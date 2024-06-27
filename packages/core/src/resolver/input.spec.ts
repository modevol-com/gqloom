import { describe, expect, it } from "vitest"
import { createInputParser, parseInputValue } from "./input"
import { silk } from "./silk"
import {
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLString,
  GraphQLFloat,
  GraphQLInt,
} from "graphql"

describe("parseInput", () => {
  it("should parse undefined", async () => {
    expect(await parseInputValue(undefined, undefined)).toBeUndefined()
    expect(await parseInputValue(undefined, 1)).toEqual(1)
    expect(await parseInputValue(undefined, "abc")).toEqual("abc")
    expect(await parseInputValue(undefined, {})).toEqual({})
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
        if (name.length > 10) throw new Error("Name too long")
        return { name, birthday, heightInMeters }
      }
    )
    it("should accept undefined", async () => {
      const output1 = await parseInputValue(Giraffe, undefined)
      expect(output1.name).toBe("Tallulah")
      expect(output1.birthday).toBeInstanceOf(Date)
      expect(output1.heightInMeters).toBe(1.5)
    })

    it("should accept partial", async () => {
      const Twiga: IGiraffe = {
        name: "Twiga",
        birthday: new Date(),
        heightInMeters: 1.5,
      }

      expect(await parseInputValue(Giraffe, Twiga)).toEqual(Twiga)
    })

    it("should throw errors", () => {
      const nameVeryLong = "this is a very long name, and it should fail"
      expect(async () =>
        parseInputValue(Giraffe, { name: nameVeryLong })
      ).rejects.toThrowError("Name too long")
    })
  })

  describe("should parse Record", async () => {
    const Giraffe = {
      name: silk<string, string | undefined>(
        GraphQLString,
        async (input = "Twiga") => {
          if (input.length > 10) throw new Error("Name too long")
          return input
        }
      ),
      birthday: silk<Date, Date | undefined>(
        GraphQLString,
        async (input = new Date()) => {
          await new Promise((resolve) => setTimeout(resolve, 6))
          return input
        }
      ),
      heightInMeters: silk<number, number | undefined>(
        GraphQLFloat,
        (input = 1.5) => input
      ),
    }

    it("should accept undefined", async () => {
      const output1 = await parseInputValue(Giraffe, undefined)
      expect(output1.name).toBe("Twiga")
      expect(output1.birthday).toBeInstanceOf(Date)
      expect(output1.heightInMeters).toBe(1.5)
    })

    it("should accept partial", async () => {
      const Twiga: IGiraffe = {
        name: "Twiga",
        birthday: new Date(),
        heightInMeters: 1.5,
      }
      expect(await parseInputValue(Giraffe, Twiga)).toEqual(Twiga)
    })

    it("should throw errors", () => {
      const nameVeryLong = "this is a very long name, and it should fail"
      expect(async () =>
        parseInputValue(Giraffe, { name: nameVeryLong })
      ).rejects.toThrowError("Name too long")
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

    expect(result).toEqual({ count: 1 })
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
          return n
        }),
      },
      { count: 1 }
    )
    await parseInput()
    await parseInput()
    await parseInput()
    expect(parseTime).toBe(1)
  })

  it("should be able to clear cache", async () => {
    let parseTime = 0
    const parseInput = createInputParser(
      {
        count: silk(GraphQLInt, (n) => {
          parseTime++
          return n
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
  })
})

interface IGiraffe {
  name: string
  birthday: Date
  heightInMeters: number
}
