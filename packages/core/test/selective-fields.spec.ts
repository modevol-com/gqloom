import { type GraphQLResolveInfo, GraphQLString, execute, parse } from "graphql"
import { describe, expect, it } from "vitest"
import { query, resolver, silk, useResolverPayload, weave } from "../src"

describe("selective fields", () => {
  let info: GraphQLResolveInfo
  const simpleResolver = resolver({
    hello: query(silk(GraphQLString)).resolve(() => {
      info = useResolverPayload()!.info
      return "hello GQLoom"
    }),
  })

  const schema = weave(simpleResolver)

  it("should be able to access the info object", async () => {
    const result = await execute({
      schema,
      document: parse(/* GraphQL */ `
        query {
          hello
        }
      `),
    })

    expect(result.data?.hello).toBe("hello GQLoom")
    expect(info).toBeDefined()
  })
})
