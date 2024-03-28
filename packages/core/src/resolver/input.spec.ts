import { describe, expect, it } from "vitest"
import { parseInput } from "./input"
import { fabric } from "./fabric"
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

  it("should be able to keep result", async () => {
    let parseTimes = 0
    const Giraffe = fabric<IGiraffe, Partial<IGiraffe>>(
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
        heightInMeters = Math.random(),
      }) => {
        parseTimes++
        await new Promise((resolve) => setTimeout(resolve, 6))
        return {
          name,
          birthday,
          heightInMeters,
        }
      }
    )

    const input: Partial<IGiraffe> = {
      name: "Kiyena",
    }

    const output1 = await parseInput(Giraffe, input)
    const output2 = await parseInput(Giraffe, input)
    expect(output1).toEqual(output2)
    expect(parseTimes).toBe(1)
  })

  describe("should parse Fabric", () => {
    const Giraffe = fabric<IGiraffe, Partial<IGiraffe>>(
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
    it("should be able to accept undefined", async () => {
      const output1 = await parseInput(Giraffe, undefined)
      expect(output1.name).toBe("Tallulah")
      expect(output1.birthday).toBeInstanceOf(Date)
      expect(output1.heightInMeters).toBe(1.5)
    })

    it("should be able to accept partial", async () => {
      const Twiga: IGiraffe = {
        name: "Twiga",
        birthday: new Date(),
        heightInMeters: 1.5,
      }

      expect(await parseInput(Giraffe, Twiga)).toEqual(Twiga)
    })

    it("should be able to throw errors", () => {
      const nameVeryLong = "this is a very long name, and it should fail"
      expect(async () =>
        parseInput(Giraffe, { name: nameVeryLong })
      ).rejects.toThrowError("Name too long")
    })
  })

  describe("should parse Record", async () => {
    const Giraffe = {
      name: fabric<string, string | undefined>(
        GraphQLString,
        async (input = "Twiga") => {
          if (input.length > 10) throw new Error("Name too long")
          return input
        }
      ),
      birthday: fabric<Date, Date | undefined>(
        GraphQLString,
        async (input = new Date()) => {
          await new Promise((resolve) => setTimeout(resolve, 6))
          return input
        }
      ),
      heightInMeters: fabric<number, number | undefined>(
        GraphQLFloat,
        (input = 1.5) => input
      ),
    }

    it("should be able to accept undefined", async () => {
      const output1 = await parseInput(Giraffe, undefined)
      expect(output1.name).toBe("Twiga")
      expect(output1.birthday).toBeInstanceOf(Date)
      expect(output1.heightInMeters).toBe(1.5)
    })

    it("should be able to accept partial", async () => {
      const Twiga: IGiraffe = {
        name: "Twiga",
        birthday: new Date(),
        heightInMeters: 1.5,
      }
      expect(await parseInput(Giraffe, Twiga)).toEqual(Twiga)
    })

    it("should be able to throw errors", () => {
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
