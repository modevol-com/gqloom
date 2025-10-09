import { field, query, resolver, silk, weave } from "@gqloom/core"
import { asyncContextProvider } from "@gqloom/core/context"
import { execute, GraphQLString, parse } from "graphql"
import { beforeEach, describe, expect, it } from "vitest"
import { useSelectedFields } from "../src/context"
import { getSelectedFields } from "../src/utils"
import { PrismaClient } from "./client"
import * as silks from "./generated"

describe("getSelectedFields", () => {
  const db = new PrismaClient()
  let selectedFields: Record<string, boolean | undefined>
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
  const db = new PrismaClient()
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
