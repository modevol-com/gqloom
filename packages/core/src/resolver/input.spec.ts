import { describe, expect, it } from "vitest"
import { parseInput } from "./input"
import { silk } from "./silk"
import {
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLString,
  GraphQLFloat,
} from "graphql"

describe("parseInput", () => {
  it("should parse undefined", async () => {
    expect(await parseInput(undefined, undefined)).toBeUndefined()
    expect(await parseInput(undefined, 1)).toBeUndefined()
    expect(await parseInput(undefined, "abc")).toBeUndefined()
    expect(await parseInput(undefined, {})).toBeUndefined()
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
      const output1 = await parseInput(Giraffe, undefined)
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

      expect(await parseInput(Giraffe, Twiga)).toEqual(Twiga)
    })

    it("should throw errors", () => {
      const nameVeryLong = "this is a very long name, and it should fail"
      expect(async () =>
        parseInput(Giraffe, { name: nameVeryLong })
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
      const output1 = await parseInput(Giraffe, undefined)
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
      expect(await parseInput(Giraffe, Twiga)).toEqual(Twiga)
    })

    it("should throw errors", () => {
      const nameVeryLong = "this is a very long name, and it should fail"
      expect(async () =>
        parseInput(Giraffe, { name: nameVeryLong })
      ).rejects.toThrowError("Name too long")
    })
  })
})

interface IGiraffe {
  name: string
  birthday: Date
  heightInMeters: number
}
