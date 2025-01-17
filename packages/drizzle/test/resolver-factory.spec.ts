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
        age: 30,
        email: "john@example.com",
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
    it("should create a select array query", async () => {
      const query = factory.selectArrayQuery()
      expect(query).toBeDefined()

      const result = await query.resolve({})
      expect(result).toEqual([
        {
          id: expect.any(Number),
          name: "John",
          age: 30,
          email: "john@example.com",
        },
      ])
    })
  })
})
