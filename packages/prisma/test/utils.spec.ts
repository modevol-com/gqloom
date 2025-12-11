import { field, query, resolver, silk, weave } from "@gqloom/core"
import { asyncContextProvider } from "@gqloom/core/context"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import { execute, GraphQLString, parse } from "graphql"
import { beforeAll, beforeEach, describe, expect, it } from "vitest"
import CREATE_TABLES from "../prisma/CREATE_TABLES.json"
import { useSelectedFields } from "../src/context"
import { getSelectedFields } from "../src/utils"
import { PrismaClient } from "./client/client"
import * as silks from "./generated"

describe("getSelectedFields", () => {
  const adapter = new PrismaBetterSqlite3({ url: ":memory:" })
  const db = new PrismaClient({ adapter })
  let selectedFields: Record<string, boolean | undefined>
  beforeAll(async () => {
    for (const statement of CREATE_TABLES) {
      await db.$executeRawUnsafe(statement)
    }
  })
  const r = resolver.of(silks.User, {
    users: query(silks.User.list()).resolve(async (_input, payload) => {
      selectedFields = getSelectedFields(silks.User, payload)
      const users = await db.user.findMany({
        select: getSelectedFields(silks.User, payload),
      })
      return users
    }),

    greeting: field(silk(GraphQLString))
      .derivedFrom("name")
      .resolve((user) => `Hello ${user.name}`),
  })

  const schema = weave(r)

  beforeEach(() => {
    selectedFields = {}
  })

  it("should access selected columns", async () => {
    const query = parse(/* GraphQL */ `
      query {
        users {
          id
          name
        }
      }
    `)
    await execute({ schema, document: query })
    expect(selectedFields).toMatchInlineSnapshot(`
      {
        "id": true,
        "name": true,
      }
    `)
  })
})

describe("useSelectedFields", () => {
  const adapter = new PrismaBetterSqlite3({ url: ":memory:" })
  const db = new PrismaClient({ adapter })
  let selectedFields: Record<string, boolean | undefined>
  const r = resolver.of(silks.User, {
    users: query(silks.User.list()).resolve(async () => {
      selectedFields = useSelectedFields(silks.User)
      const users = await db.user.findMany({
        select: useSelectedFields(silks.User),
      })
      return users
    }),

    greeting: field(silk(GraphQLString))
      .derivedFrom("name")
      .resolve((user) => `Hello ${user.name}`),
  })

  const schema = weave(asyncContextProvider, r)

  beforeEach(() => {
    selectedFields = {}
  })

  it("should access selected columns", async () => {
    const query = parse(/* GraphQL */ `
      query {
        users {
          id
          name
        }
      }
    `)
    await execute({ schema, document: query })
    expect(selectedFields).toMatchInlineSnapshot(`
      {
        "id": true,
        "name": true,
      }
    `)
  })
})
