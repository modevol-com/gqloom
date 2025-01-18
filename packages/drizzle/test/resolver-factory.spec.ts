import { eq } from "drizzle-orm"
import { type LibSQLDatabase, drizzle } from "drizzle-orm/libsql"
import * as sqlite from "drizzle-orm/sqlite-core"
import * as v from "valibot"
import { afterAll, beforeAll, describe, expect, expectTypeOf, it } from "vitest"
import {
  DrizzleResolverFactory,
  type InferSelectArrayOptions,
  type InferSelectSingleOptions,
} from "../src"
import * as schema from "./db/schema"
import { user } from "./db/schema"

describe("DrizzleResolverFactory", () => {
  let db: LibSQLDatabase<typeof schema>
  let userFactory: DrizzleResolverFactory<typeof db, typeof schema.user>

  beforeAll(async () => {
    const pathToDB = new URL("./db/local.db", import.meta.url)
    db = drizzle({
      schema,
      connection: { url: `file:${pathToDB.pathname}` },
    })
    userFactory = DrizzleResolverFactory.create(db, schema.user)

    await db.insert(user).values([
      {
        name: "John",
        age: 10,
        email: "john@example.com",
      },
      {
        name: "Jane",
        age: 11,
      },
      {
        name: "Jim",
        age: 12,
      },
      {
        name: "Joe",
        age: 13,
      },
      {
        name: "Jill",
        age: 14,
      },
    ] satisfies (typeof user.$inferInsert)[])
  })

  afterAll(async () => {
    await db.delete(user)
  })

  it("should create a resolver factory", () => {
    expect(userFactory).toBeInstanceOf(DrizzleResolverFactory)
  })

  it("should throw an error if the table is not found", () => {
    const unknownTable = sqlite.sqliteTable("unknown", {
      id: sqlite.integer("id").primaryKey(),
    })
    expect(() => DrizzleResolverFactory.create(db, unknownTable)).toThrow(
      "GQLoom-Drizzle Error: Table unknown not found in drizzle instance. Did you forget to pass schema to drizzle constructor?"
    )
  })

  describe("selectArrayQuery", () => {
    it("should be created without error", async () => {
      const query = userFactory.selectArrayQuery()
      expect(query).toBeDefined()
    })

    it("should resolve correctly with orderBy", async () => {
      const query = userFactory.selectArrayQuery()

      let answer
      answer = await query.resolve({ orderBy: [{ age: "asc" }] })
      expect(answer).toMatchObject([
        { age: 10 },
        { age: 11 },
        { age: 12 },
        { age: 13 },
        { age: 14 },
      ])

      answer = await query.resolve({ orderBy: [{ age: "desc" }] })
      expect(answer).toMatchObject([
        { age: 14 },
        { age: 13 },
        { age: 12 },
        { age: 11 },
        { age: 10 },
      ])
    })

    it("should resolve correctly with filters", async () => {
      const query = userFactory.selectArrayQuery()
      let answer
      answer = await query.resolve({})
      expect(answer).toHaveLength(5)

      answer = await query.resolve({
        where: { age: { gte: 12 } },
      })
      expect(answer).toMatchObject([{ age: 12 }, { age: 13 }, { age: 14 }])

      answer = await query.resolve({
        where: { age: { lt: 12 } },
      })
      expect(answer).toMatchObject([{ age: 10 }, { age: 11 }])
      answer = await query.resolve({
        where: { age: { gte: 12, lt: 13 } },
      })
      expect(answer).toMatchObject([{ age: 12 }])

      answer = await query.resolve({
        where: { age: { inArray: [10, 11] } },
      })
      expect(new Set(answer)).toMatchObject(new Set([{ age: 10 }, { age: 11 }]))

      answer = await query.resolve({
        where: { age: { notInArray: [10, 11] } },
      })
      expect(new Set(answer)).toMatchObject(
        new Set([{ age: 12 }, { age: 13 }, { age: 14 }])
      )

      answer = await query.resolve({
        where: { age: { OR: [{ eq: 10 }, { eq: 11 }] } },
      })
      expect(new Set(answer)).toMatchObject(new Set([{ age: 10 }, { age: 11 }]))

      answer = await query.resolve({
        where: { OR: [{ age: { eq: 10 } }, { age: { eq: 11 } }] },
      })
      expect(new Set(answer)).toMatchObject(new Set([{ age: 10 }, { age: 11 }]))

      answer = await query.resolve({
        where: { name: { like: "J%" } },
      })
      expect(answer).toHaveLength(5)

      await expect(() =>
        query.resolve({
          where: { age: { eq: 10 }, OR: [{ age: { eq: 11 } }] },
        })
      ).rejects.toThrow("Cannot specify both fields and 'OR' in table filters!")
      await expect(() =>
        query.resolve({
          where: { age: { eq: 10, OR: [{ eq: 11 }] } },
        })
      ).rejects.toThrow(
        "WHERE age: Cannot specify both fields and 'OR' in column operators!"
      )

      answer = await query.resolve({
        where: { age: { isNull: true } },
      })
      expect(answer).toHaveLength(0)
    })

    it("should be created with custom input", async () => {
      const query = userFactory.selectArrayQuery({
        input: v.pipe(
          v.object({
            age: v.nullish(v.number()),
          }),
          v.transform(({ age }) => ({
            where: age != null ? eq(user.age, age) : undefined,
          }))
        ),
      })

      expect(query).toBeDefined()
      const answer = await query.resolve({ age: 10 })
      expect(answer).toMatchObject([{ age: 10 }])
    })

    it("should be created with middlewares", async () => {
      type SelectArrayOptions = InferSelectArrayOptions<
        typeof db,
        typeof schema.user
      >

      let count = 0

      const query = userFactory.selectArrayQuery({
        middlewares: [
          async ({ parseInput, next }) => {
            const opts = await parseInput()
            if (opts.issues) throw new Error("Invalid input")
            expectTypeOf(opts.value).toEqualTypeOf<
              NonNullable<SelectArrayOptions>
            >()
            count++
            const answer = await next()
            expectTypeOf(answer).toEqualTypeOf<
              (typeof schema.user.$inferSelect)[]
            >()
            return answer
          },
        ],
      })

      await query.resolve({})
      expect(count).toBe(1)
    })
  })

  describe("selectSingleQuery", () => {
    it("should be created without error", async () => {
      const query = userFactory.selectSingleQuery()
      expect(query).toBeDefined()
    })

    it("should resolve correctly with orderBy", async () => {
      const query = userFactory.selectSingleQuery()
      expect(
        await query.resolve({
          orderBy: [{ age: "asc" }],
        })
      ).toMatchObject({ age: 10 })
    })

    it("should resolve correctly with filters", async () => {
      const query = userFactory.selectSingleQuery()
      expect(
        await query.resolve({
          where: { age: { eq: 12 } },
        })
      ).toMatchObject({ age: 12 })
    })

    it("should be created with custom input", async () => {
      const query = userFactory.selectSingleQuery({
        input: v.pipe(
          v.object({
            age: v.nullish(v.number()),
          }),
          v.transform(({ age }) => ({
            where: age != null ? eq(user.age, age) : undefined,
          }))
        ),
      })

      expect(query).toBeDefined()
      expect(await query.resolve({ age: 10 })).toMatchObject({ age: 10 })
    })

    it("should be created with middlewares", async () => {
      type SelectSingleOptions = InferSelectSingleOptions<
        typeof db,
        typeof schema.user
      >
      let count = 0
      const query = userFactory.selectSingleQuery({
        middlewares: [
          async ({ parseInput, next }) => {
            const opts = await parseInput()
            if (opts.issues) throw new Error("Invalid input")
            expectTypeOf(opts.value).toEqualTypeOf<
              NonNullable<SelectSingleOptions>
            >()
            count++
            const answer = await next()
            expectTypeOf(answer).toEqualTypeOf<
              typeof schema.user.$inferSelect | undefined | null
            >()
            return answer
          },
        ],
      })

      await query.resolve({})
      expect(count).toBe(1)
    })
  })
})
