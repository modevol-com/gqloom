import { query, silk } from "@gqloom/core"
import { GraphQLNonNull, GraphQLObjectType, GraphQLString } from "graphql"
import { describe, expect, it } from "vitest"
import { resolveReference, resolver } from "../src"

describe("FederatedChainResolver", () => {
  it("should define a resolver", () => {
    const r1 = resolver({
      query: query(silk(GraphQLString), () => "foo"),
    })
    expect(r1).toBeDefined()
    expect(r1["~meta"].fields.query).toBeDefined()
  })

  it("should define a object resolver", () => {
    interface IUser {
      id: string
      name: string
    }
    const User = silk<IUser>(
      new GraphQLObjectType({
        name: "User",
        fields: {
          id: { type: new GraphQLNonNull(GraphQLString) },
          name: { type: new GraphQLNonNull(GraphQLString) },
        },
        extensions: {
          directives: { key: { fields: "id", resolvable: true } },
          ...resolveReference<IUser, "id">(({ id }) => ({ id, name: "@ava" })),
        },
      })
    )
    const r1 = resolver.of(User, {
      query: query(silk(GraphQLString), () => "foo"),
    })
    expect(r1).toBeDefined()
    expect(r1["~meta"].fields.query).toBeDefined()
    expect(r1["~meta"].parent).toBe(User)
  })
})
