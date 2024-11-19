import {
  GraphQLFloat,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
  lexicographicSortSchema,
  printSchema,
} from "graphql"
import { describe, expect, it } from "vitest"
import { weave } from "../schema"
import type { Middleware } from "../utils"
import { loom } from "./resolver"
import { silk } from "./silk"

const { resolver, query, mutation, field } = loom

interface IGiraffe {
  name: string
  birthday: Date
  heightInMeters: number
}

const Giraffe = silk<IGiraffe>(
  new GraphQLObjectType({
    name: "Giraffe",
    fields: {
      name: { type: new GraphQLNonNull(GraphQLString) },
      birthday: { type: new GraphQLNonNull(GraphQLString) },
      heightInMeters: { type: new GraphQLNonNull(GraphQLFloat) },
    },
  })
)

const GiraffeInput = silk<Partial<IGiraffe>>(
  new GraphQLObjectType({
    name: "GiraffeInput",
    fields: {
      name: { type: GraphQLString },
      birthday: { type: GraphQLString },
      heightInMeters: { type: GraphQLFloat },
    },
  })
)

describe("resolver", () => {
  const Skyler: IGiraffe = {
    name: "Skyler",
    birthday: new Date(),
    heightInMeters: 5,
  }

  let callCount = 0
  const callCounter: Middleware = async (next) => {
    callCount++
    return next()
  }
  const giraffeResolver = resolver.of(
    Giraffe,
    {
      age: field(silk(GraphQLInt), async (giraffe) => {
        return new Date().getFullYear() - giraffe.birthday.getFullYear()
      }),

      greeting: field(silk(new GraphQLNonNull(GraphQLString)), {
        input: { myName: silk(GraphQLString) },
        resolve: (giraffe, { myName }) =>
          `Hello, ${myName ?? "my friend"}! My name is ${giraffe.name}.`,
      }),

      nominalAge: field(silk<number>(GraphQLInt), {
        middlewares: [async (next) => (await next()) + 1],
        resolve: async (giraffe) => {
          return new Date().getFullYear() - giraffe.birthday.getFullYear()
        },
      }),
    },
    {
      middlewares: [callCounter],
    }
  )

  describe("query and mutation", () => {
    it("should work", async () => {
      const queryGiraffe = query(Giraffe, () => Skyler)
      expect(await queryGiraffe.resolve(undefined)).toEqual(Skyler)
    })

    it("should accept input", async () => {
      const createGiraffe = mutation(Giraffe, {
        input: GiraffeInput,
        resolve: (data) => ({
          name: data.name ?? "Giraffe",
          birthday: data.birthday ?? new Date(),
          heightInMeters: data.heightInMeters ?? 5,
        }),
      })
      const birthday = new Date()
      expect(await createGiraffe.resolve({ name: "Skyler", birthday })).toEqual(
        {
          name: "Skyler",
          birthday,
          heightInMeters: 5,
        }
      )
    })

    it("should work with middlewares", async () => {
      const numberSchema = silk(GraphQLFloat)

      const middleware: Middleware = async (next) => {
        const result = await next()
        return result + 1
      }

      const queryNumber = query(numberSchema, {
        input: { n: numberSchema },
        middlewares: [middleware],
        resolve: ({ n }) => n,
      })

      expect(await queryNumber.resolve({ n: 1 })).toEqual(2)
    })
  })

  describe("field", () => {
    it("should work", async () => {
      expect(await giraffeResolver.age.resolve(Skyler, undefined)).toEqual(
        new Date().getFullYear() - Skyler.birthday.getFullYear()
      )
    })

    it("should accept input", async () => {
      expect(
        await giraffeResolver.greeting.resolve(Skyler, { myName: "Hilun" })
      ).toEqual(`Hello, Hilun! My name is Skyler.`)
    })

    it("should work with middlewares", async () => {
      expect(
        await giraffeResolver.nominalAge.resolve(Skyler, undefined)
      ).toEqual(new Date().getFullYear() - Skyler.birthday.getFullYear() + 1)
    })

    it("should hidden fields", () => {
      const r1 = resolver.of(Giraffe, {
        hello: query(Giraffe, () => 0 as any),

        heightInMeters: field.hidden,
      })
      const schema = weave(r1)
      expect(
        printSchema(lexicographicSortSchema(schema))
      ).toMatchInlineSnapshot(`
        "type Giraffe {
          birthday: String!
          name: String!
        }

        type Query {
          hello: Giraffe
        }"
      `)
    })
  })

  it("should call middlewares", async () => {
    await giraffeResolver.age.resolve(Skyler, undefined)
    expect(callCount).toBeGreaterThanOrEqual(1)
  })

  it("should call middlewares in order", async () => {
    const logs: string[] = []
    const mutationMiddleware: Middleware = async (next) => {
      logs.push("query middleware")
      const result = await next()
      logs.push("query middleware end")
      return result
    }
    const resolveMiddleware: Middleware = async (next) => {
      logs.push("resolve middleware")
      const result = await next()
      logs.push("resolve middleware end")
      return result
    }

    const r1 = resolver(
      {
        hello: mutation(silk(GraphQLString), {
          resolve: () => "world",
          middlewares: [mutationMiddleware],
        }),
      },
      { middlewares: [resolveMiddleware] }
    )

    await r1.hello.resolve(undefined)

    expect(logs).toEqual([
      "resolve middleware",
      "query middleware",
      "query middleware end",
      "resolve middleware end",
    ])
  })
})
