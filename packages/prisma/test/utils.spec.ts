import { field, query, silk, weave } from "@gqloom/core"
import { resolver } from "@gqloom/core"
import { GraphQLString, execute, parse } from "graphql"
import { beforeEach, describe, expect, it } from "vitest"
import { getSelectedFields } from "../src/utils"
import * as silks from "./generated"

describe("getSelectedFields", () => {
  let selectedFields: Record<string, boolean>
  const r = resolver.of(silks.User, {
    users: query(silks.User.list()).resolve((_input, payload) => {
      selectedFields = getSelectedFields(silks.User, payload)

      return []
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
