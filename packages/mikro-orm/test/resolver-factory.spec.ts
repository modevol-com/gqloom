import { resolver, weave } from "@gqloom/core"
import {
  EntitySchema,
  MikroORM,
  RequestContext,
  defineConfig,
} from "@mikro-orm/libsql"
import { printSchema } from "graphql"
import * as v from "valibot"
import { beforeAll, describe, expect, expectTypeOf, it } from "vitest"
import { mikroSilk } from "../src"
import { MikroResolverFactory } from "../src/factory"

interface IUser {
  id: number
  name: string
  email: string
  age?: number | null
}

const User = mikroSilk(
  new EntitySchema<IUser>({
    name: "User",
    properties: {
      id: { type: "number", primary: true },
      name: { type: "string" },
      email: { type: "string" },
      age: { type: "number", nullable: true },
    },
  })
)

const ORMConfig = defineConfig({
  entities: [User],
  dbName: ":memory:",
  allowGlobalContext: true,
})

describe("MikroResolverFactory", async () => {
  let orm: MikroORM
  beforeAll(async () => {
    orm = await MikroORM.init(ORMConfig)
    await orm.getSchemaGenerator().updateSchema()

    // Create test data
    await RequestContext.create(orm.em, async () => {
      const users = [
        orm.em.create(User, {
          name: "John Doe",
          email: "john@example.com",
          age: 25,
        }),
        orm.em.create(User, {
          name: "Jane Doe",
          email: "jane@example.com",
          age: 30,
        }),
        orm.em.create(User, {
          name: "Bob Smith",
          email: "bob@example.com",
          age: 20,
        }),
        orm.em.create(User, {
          name: "Alice Johnson",
          email: "alice@example.com",
          age: 35,
        }),
        orm.em.create(User, {
          name: "Charlie Brown",
          email: "charlie@example.com",
          age: 28,
        }),
      ]
      await orm.em.persistAndFlush(users)
    })
  })

  const userFactory = new MikroResolverFactory(User, () => orm.em)

  describe.concurrent("countQuery", () => {
    it("should be created without error", async () => {
      const query = userFactory.countQuery()
      expect(query).toBeDefined()
    })

    it("should resolve correctly with filters", async () => {
      const query = userFactory.countQuery()
      let answer

      answer = await query["~meta"].resolve({})
      expect(answer).toBe(5)

      answer = await query["~meta"].resolve({
        where: { age: { $gte: 30 } },
      })
      expect(answer).toBe(2)

      answer = await query["~meta"].resolve({
        where: { age: { $lt: 30 } },
      })
      expect(answer).toBe(3)

      answer = await query["~meta"].resolve({
        where: { age: { $in: [25, 30] } },
      })
      expect(answer).toBe(2)

      answer = await query["~meta"].resolve({
        where: { name: { $like: "J%" } },
      })
      expect(answer).toBe(2)
    })

    it("should be created with custom input", async () => {
      const query = userFactory.countQuery({
        input: v.pipe(
          v.object({
            age: v.nullish(v.number()),
          }),
          v.transform(({ age }) => ({
            where: age != null ? { age: { $eq: age } } : undefined,
          }))
        ),
      })

      expect(query).toBeDefined()
      const executor = resolver({ query }).toExecutor()
      expect(await executor.query({ age: 25 })).toBe(1)
      expect(await executor.query({ age: null })).toBe(5)
    })

    it("should be created with middlewares", async () => {
      let count = 0
      const query = userFactory.countQuery({
        middlewares: [
          async ({ parseInput, next }) => {
            const opts = await parseInput()
            if (opts.issues) throw new Error("Invalid input")
            count++
            const answer = await next()
            expectTypeOf(answer).toEqualTypeOf<number>()
            return answer
          },
        ],
      })

      const executor = resolver({ query }).toExecutor()
      await executor.query({})
      expect(count).toBe(1)
    })

    it("should weave schema without error", () => {
      const r = resolver({ countQuery: userFactory.countQuery() })
      const schema = weave(r)
      expect(printSchema(schema)).toMatchInlineSnapshot(`
        "type Query {
          countQuery(where: UserFilter): Int!
        }

        input UserFilter {
          id: IDMikroComparisonOperators
          name: StringMikroComparisonOperators
          email: StringMikroComparisonOperators
          age: FloatMikroComparisonOperators
        }

        input IDMikroComparisonOperators {
          """Equals. Matches values that are equal to a specified value."""
          eq: ID

          """Greater. Matches values that are greater than a specified value."""
          gt: ID

          """
          Greater or Equal. Matches values that are greater than or equal to a specified value.
          """
          gte: ID

          """Contains, Contains, Matches any of the values specified in an array."""
          in: [ID!]

          """Lower, Matches values that are less than a specified value."""
          lt: ID

          """
          Lower or equal, Matches values that are less than or equal to a specified value.
          """
          lte: ID

          """Not equal. Matches all values that are not equal to a specified value."""
          ne: ID

          """Not contains. Matches none of the values specified in an array."""
          nin: [ID!]

          """&&"""
          overlap: [ID!]

          """@>"""
          contains: [ID!]

          """<@"""
          contained: [ID!]
        }

        input StringMikroComparisonOperators {
          """Equals. Matches values that are equal to a specified value."""
          eq: String

          """Greater. Matches values that are greater than a specified value."""
          gt: String

          """
          Greater or Equal. Matches values that are greater than or equal to a specified value.
          """
          gte: String

          """Contains, Contains, Matches any of the values specified in an array."""
          in: [String!]

          """Lower, Matches values that are less than a specified value."""
          lt: String

          """
          Lower or equal, Matches values that are less than or equal to a specified value.
          """
          lte: String

          """Not equal. Matches all values that are not equal to a specified value."""
          ne: String

          """Not contains. Matches none of the values specified in an array."""
          nin: [String!]

          """&&"""
          overlap: [String!]

          """@>"""
          contains: [String!]

          """<@"""
          contained: [String!]

          """Like. Uses LIKE operator"""
          like: String

          """Regexp. Uses REGEXP operator"""
          re: String

          """Full text.	A driver specific full text search function."""
          fulltext: String

          """ilike"""
          ilike: String
        }

        input FloatMikroComparisonOperators {
          """Equals. Matches values that are equal to a specified value."""
          eq: Float

          """Greater. Matches values that are greater than a specified value."""
          gt: Float

          """
          Greater or Equal. Matches values that are greater than or equal to a specified value.
          """
          gte: Float

          """Contains, Contains, Matches any of the values specified in an array."""
          in: [Float!]

          """Lower, Matches values that are less than a specified value."""
          lt: Float

          """
          Lower or equal, Matches values that are less than or equal to a specified value.
          """
          lte: Float

          """Not equal. Matches all values that are not equal to a specified value."""
          ne: Float

          """Not contains. Matches none of the values specified in an array."""
          nin: [Float!]

          """&&"""
          overlap: [Float!]

          """@>"""
          contains: [Float!]

          """<@"""
          contained: [Float!]
        }"
      `)
    })
  })
})
