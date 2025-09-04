import { resolver, weave } from "@gqloom/core"
import {
  EntitySchema,
  MikroORM,
  QueryOrder,
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
      const executor = resolver({ query }).toExecutor()
      let answer

      answer = await executor.query({})
      expect(answer).toBe(5)

      answer = await executor.query({
        where: { age: { gte: 30 } },
      })
      expect(answer).toBe(2)

      answer = await executor.query({
        where: { age: { lt: 30 } },
      })
      expect(answer).toBe(3)

      answer = await executor.query({
        where: { age: { in: [25, 30] } },
      })
      expect(answer).toBe(2)

      answer = await executor.query({
        where: { name: { like: "J%" } },
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

  describe.concurrent("findQuery", () => {
    it("should be created without error", async () => {
      const query = userFactory.findQuery()
      expect(query).toBeDefined()
    })

    it("should resolve correctly with filters, sorting, and pagination", async () => {
      const query = userFactory.findQuery()
      const executor = resolver({ query }).toExecutor()
      let answer: IUser[]

      // No args
      answer = await executor.query({})
      expect(answer).toHaveLength(5)

      // Where
      answer = await executor.query({
        where: { age: { gte: 30 } },
      })
      expect(answer).toHaveLength(2)
      expect(answer.map((u) => u.name).sort()).toEqual([
        "Alice Johnson",
        "Jane Doe",
      ])

      // OrderBy
      answer = await executor.query({
        orderBy: { age: "DESC" },
      })
      expect(answer.map((u) => u.name)).toEqual([
        "Alice Johnson",
        "Jane Doe",
        "Charlie Brown",
        "John Doe",
        "Bob Smith",
      ])

      // Limit
      answer = await executor.query({
        limit: 2,
        orderBy: { age: "ASC" },
      })
      expect(answer).toHaveLength(2)
      expect(answer.map((u) => u.name)).toEqual(["Bob Smith", "John Doe"])

      // Offset
      answer = await executor.query({
        limit: 2,
        offset: 2,
        orderBy: { age: "ASC" },
      })
      expect(answer).toHaveLength(2)
      expect(answer.map((u) => u.name)).toEqual(["Charlie Brown", "Jane Doe"])
    })

    it("should be created with custom input", async () => {
      const query = userFactory.findQuery({
        input: v.pipe(
          v.object({
            minAge: v.nullish(v.number()),
          }),
          v.transform(({ minAge }) => ({
            where: minAge != null ? { age: { $gte: minAge } } : {},
            orderBy: { age: QueryOrder.ASC },
          }))
        ),
      })

      expect(query).toBeDefined()
      const executor = resolver({ query }).toExecutor()
      let answer: IUser[]
      answer = await executor.query({ minAge: 30 })
      expect(answer).toHaveLength(2)
      expect(answer.map((u) => u.name)).toEqual(["Jane Doe", "Alice Johnson"])

      answer = await executor.query({ minAge: null })
      expect(answer).toHaveLength(5)
    })

    it("should be created with middlewares", async () => {
      let count = 0
      const query = userFactory.findQuery({
        middlewares: [
          async ({ parseInput, next }) => {
            const opts = await parseInput()
            if (opts.issues) throw new Error("Invalid input")
            count++
            const answer = await next()
            expectTypeOf(answer).toEqualTypeOf<IUser[]>()
            return answer.map((u) => ({ ...u, name: u.name.toUpperCase() }))
          },
        ],
      })

      const executor = resolver({ query }).toExecutor()
      const answer = await executor.query({})
      expect(count).toBe(1)
      expect(answer.find((u) => u.id === 1)?.name).toBe("JOHN DOE")
    })

    it("should weave schema without error", () => {
      const r = resolver({ findQuery: userFactory.findQuery() })
      const schema = weave(r)
      expect(printSchema(schema)).toMatchInlineSnapshot(`
        "type Query {
          findQuery(where: UserFilter, orderBy: UserOrderBy, limit: Int, offset: Int): [User!]!
        }

        type User {
          id: ID!
          name: String!
          email: String!
          age: Float
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
        }

        input UserOrderBy {
          id: MikroQueryOrder
          name: MikroQueryOrder
          email: MikroQueryOrder
          age: MikroQueryOrder
        }

        enum MikroQueryOrder {
          ASC
          ASC_NULLS_LAST
          ASC_NULLS_FIRST
          DESC
          DESC_NULLS_LAST
          DESC_NULLS_FIRST
        }"
      `)
    })
  })

  describe.concurrent("findAndCountQuery", () => {
    it("should be created without error", async () => {
      const query = userFactory.findAndCountQuery()
      expect(query).toBeDefined()
    })

    it("should resolve correctly with filters, sorting, and pagination", async () => {
      const query = userFactory.findAndCountQuery()
      const executor = resolver({ query }).toExecutor()
      let answer: { items: IUser[]; count: number }

      // No args
      answer = await executor.query({})
      expect(answer.items).toHaveLength(5)
      expect(answer.count).toBe(5)

      // Where
      answer = await executor.query({
        where: { age: { gte: 30 } },
      })
      expect(answer.items).toHaveLength(2)
      expect(answer.count).toBe(2)
      expect(answer.items.map((u) => u.name).sort()).toEqual([
        "Alice Johnson",
        "Jane Doe",
      ])

      // OrderBy
      answer = await executor.query({
        orderBy: { age: "DESC" },
      })
      expect(answer.items).toHaveLength(5)
      expect(answer.count).toBe(5)
      expect(answer.items.map((u) => u.name)).toEqual([
        "Alice Johnson",
        "Jane Doe",
        "Charlie Brown",
        "John Doe",
        "Bob Smith",
      ])

      // Limit
      answer = await executor.query({
        limit: 2,
        orderBy: { age: "ASC" },
      })
      expect(answer.items).toHaveLength(2)
      expect(answer.count).toBe(5) // Limit only affects items, not total count
      expect(answer.items.map((u) => u.name)).toEqual(["Bob Smith", "John Doe"])

      // Offset
      answer = await executor.query({
        limit: 2,
        offset: 2,
        orderBy: { age: "ASC" },
      })
      expect(answer.items).toHaveLength(2)
      expect(answer.count).toBe(5) // Offset only affects items, not total count
      expect(answer.items.map((u) => u.name)).toEqual([
        "Charlie Brown",
        "Jane Doe",
      ])
    })

    it("should be created with custom input", async () => {
      const query = userFactory.findAndCountQuery({
        input: v.pipe(
          v.object({
            minAge: v.nullish(v.number()),
          }),
          v.transform(({ minAge }) => ({
            where: minAge != null ? { age: { $gte: minAge } } : {},
            orderBy: { age: QueryOrder.ASC },
          }))
        ),
      })

      expect(query).toBeDefined()
      const executor = resolver({ query }).toExecutor()
      let answer: { items: IUser[]; count: number }
      answer = await executor.query({ minAge: 30 })
      expect(answer.items).toHaveLength(2)
      expect(answer.count).toBe(2)
      expect(answer.items.map((u) => u.name)).toEqual([
        "Jane Doe",
        "Alice Johnson",
      ])

      answer = await executor.query({ minAge: null })
      expect(answer.items).toHaveLength(5)
      expect(answer.count).toBe(5)
    })

    it("should be created with middlewares", async () => {
      let count = 0
      const query = userFactory.findAndCountQuery({
        middlewares: [
          async ({ parseInput, next }) => {
            const opts = await parseInput()
            if (opts.issues) throw new Error("Invalid input")
            count++
            const answer = await next()
            expectTypeOf(answer).toEqualTypeOf<{
              items: IUser[]
              count: number
            }>()
            return {
              ...answer,
              items: answer.items.map((u) => ({
                ...u,
                name: u.name.toUpperCase(),
              })),
            }
          },
        ],
      })

      const executor = resolver({ query }).toExecutor()
      const answer = await executor.query({})
      expect(count).toBe(1)
      expect(answer.items.find((u) => u.id === 1)?.name).toBe("JOHN DOE")
      expect(answer.count).toBe(5)
    })

    it("should weave schema without error", () => {
      const r = resolver({
        findAndCountQuery: userFactory.findAndCountQuery(),
      })
      const schema = weave(r)
      expect(printSchema(schema)).toMatchInlineSnapshot(`
        "type Query {
          findAndCountQuery(where: UserFilter, orderBy: UserOrderBy, limit: Int, offset: Int): UserFindAndCount!
        }

        type UserFindAndCount {
          count: Int!
          items: [User!]!
        }

        type User {
          id: ID!
          name: String!
          email: String!
          age: Float
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
        }

        input UserOrderBy {
          id: MikroQueryOrder
          name: MikroQueryOrder
          email: MikroQueryOrder
          age: MikroQueryOrder
        }

        enum MikroQueryOrder {
          ASC
          ASC_NULLS_LAST
          ASC_NULLS_FIRST
          DESC
          DESC_NULLS_LAST
          DESC_NULLS_FIRST
        }"
      `)
    })
  })
})
