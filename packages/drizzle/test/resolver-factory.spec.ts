import { type LibSQLDatabase, drizzle } from "drizzle-orm/libsql"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { DrizzleResolverFactory } from "../src"
import * as schema from "./db/schema"
import { user } from "./db/schema"

describe("DrizzleResolverFactory", () => {
  let db: LibSQLDatabase<typeof schema>
  let factory: DrizzleResolverFactory<typeof db, typeof schema.user>

  beforeAll(async () => {
    const pathToDB = new URL("./db/local.db", import.meta.url)
    db = drizzle({
      schema,
      connection: { url: `file:${pathToDB.pathname}` },
    })
    factory = new DrizzleResolverFactory(db, schema.user)

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
    expect(factory).toBeInstanceOf(DrizzleResolverFactory)
  })

  describe("selectArrayQuery", () => {
    it("should be created without error", async () => {
      const query = factory.selectArrayQuery()
      expect(query).toBeDefined()
    })

    it("should resolve correctly with orderBy", async () => {
      const query = factory.selectArrayQuery()

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
      const query = factory.selectArrayQuery()
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

      answer = await query.resolve({
        where: { age: { isNull: true } },
      })
      expect(answer).toHaveLength(0)
    })
  })
})
