import { ApolloServer } from "@apollo/server"
import gql from "graphql-tag"
import { buildSubgraphSchema } from "@apollo/subgraph"
import { describe, expect, it } from "vitest"

const typeDefs = gql`
  extend schema
    @link(
      url: "https://specs.apollo.dev/federation/v2.0"
      import: ["@key", "@shareable"]
    )

  type Query {
    me: User
  }

  type User @key(fields: "id") {
    id: ID!
    username: String
  }
`

const resolvers = {
  Query: {
    me() {
      return { id: "1", username: "@ava" }
    },
  },
  User: {
    __resolveReference({ id }: { id: string }) {
      return { id, username: "@ava" }
    },
  },
}
const schema = buildSubgraphSchema({ typeDefs, resolvers })
const server = new ApolloServer({ schema })

describe("Apollo", () => {
  it("should build schema", () => {
    expect(schema).toBeDefined()
  })

  it("should execute query", async () => {
    const reponse = await server.executeOperation({
      query: /* GraphQL */ `
        query {
          me {
            id
            username
          }
        }
      `,
    })

    if (reponse.body.kind !== "single") throw new Error("unexpected")
    expect(reponse.body.singleResult.data).toMatchObject({
      me: { id: "1", username: "@ava" },
    })
  })

  it("should execute query for entities", async () => {
    const reponse = await server.executeOperation({
      query: /* GraphQL */ `
        query ($representations: [_Any!]!) {
          _entities(representations: $representations) {
            ... on User {
              id
              username
            }
          }
        }
      `,
      variables: {
        representations: [
          { __typename: "User", id: "1" },
          { __typename: "User", id: "2" },
        ],
      },
    })

    if (reponse.body.kind !== "single") throw new Error("unexpected")
    expect(reponse.body.singleResult.data).toMatchObject({
      _entities: [
        { id: "1", username: "@ava" },
        { id: "2", username: "@ava" },
      ],
    })
  })
})
