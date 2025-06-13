import { field, query, resolver, silk, weave } from "@gqloom/core"
import { asyncContextProvider } from "@gqloom/core/context"
import { sql } from "drizzle-orm"
import { drizzle as sqliteDrizzle } from "drizzle-orm/libsql"
import { GraphQLString } from "graphql"
import { execute, parse } from "graphql"
import { afterEach, beforeAll, describe, expect, it } from "vitest"
import { useSelectedColumns } from "../src/context"
import { users } from "./schema/sqlite"

describe("useSelectedColumns", () => {
  const selectedColumns = new Set<string>()
  let logs: string[] = []
  const db = sqliteDrizzle(":memory:", {
    logger: {
      logQuery: (message) => {
        logs.push(message)
      },
    },
  })
  const r = resolver.of(users, {
    users: query(users.$list()).resolve(() => {
      for (const column of Object.keys(useSelectedColumns(users))) {
        selectedColumns.add(column)
      }
      const one = 1
      const two = 2
      if (one + two < one) {
        // it should be able to select all columns without using useSelectedColumns
        return db.select().from(users)
      }
      return db.select(useSelectedColumns(users)).from(users)
    }),

    greeting: field(silk(GraphQLString))
      .derivedFrom("name")
      .resolve((user) => `Hello ${user.name}`),
  })

  const schema = weave(asyncContextProvider, r)

  beforeAll(async () => {
    await db.run(sql`
      CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          age INTEGER,
          email TEXT
      );`)
  })

  afterEach(async () => {
    await db.delete(users)
    logs = []
  })

  it("should return the selected columns", async () => {
    const query = parse(/* GraphQL */ `
      query {
        users { 
          id
          name
        }
      }
    `)
    await db.insert(users).values({ id: 1, name: "John" })
    logs = []
    const result = await execute({ schema, document: query })
    expect(selectedColumns).toEqual(new Set(["id", "name"]))
    expect(result.data?.users).toEqual([{ id: 1, name: "John" }])
    expect(logs).toMatchInlineSnapshot(`
      [
        "select "id", "name" from "users"",
      ]
    `)
  })

  it("should return the selected columns with derived fields", async () => {
    const query = parse(/* GraphQL */ `
      query {
        users { 
          id
          greeting
        }
      }
    `)
    await db.insert(users).values({ id: 1, name: "John" })
    logs = []
    const result = await execute({ schema, document: query })
    expect(result.data?.users).toEqual([{ id: 1, greeting: "Hello John" }])
    expect(logs).toMatchInlineSnapshot(`
      [
        "select "id", "name" from "users"",
      ]
    `)
  })
})
