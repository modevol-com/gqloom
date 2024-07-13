import { describe, expect, it } from "vitest"
import { ApolloServer } from "@apollo/server"
import { ApolloServerPluginInlineTraceDisabled } from "@apollo/server/plugin/disabled"
import gql from "graphql-tag"
import { buildSubgraphSchema } from "@apollo/subgraph"
import { createYoga } from "graphql-yoga"
import Fastify from "fastify"
import { mercuriusFederationPlugin } from "@mercuriusjs/federation"
import { createMercuriusTestClient } from "mercurius-integration-testing"

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
    name: String
  }
`

const resolvers = {
  Query: {
    me() {
      return { id: "1", name: "@ava" }
    },
  },
  User: {
    __resolveReference({ id }: { id: string }) {
      return { id, name: "@ava" }
    },
  },
}

describe("Apollo", () => {
  const schema = buildSubgraphSchema({ typeDefs, resolvers })
  const server = new ApolloServer({
    schema,
    plugins: [ApolloServerPluginInlineTraceDisabled()],
  })
  it("should build schema", () => {
    expect(schema).toBeDefined()
  })

  it("should execute query", async () => {
    const reponse = await server.executeOperation({
      query: /* GraphQL */ `
        query {
          me {
            id
            name
          }
        }
      `,
    })

    if (reponse.body.kind !== "single") throw new Error("unexpected")
    expect(reponse.body.singleResult.data).toMatchObject({
      me: { id: "1", name: "@ava" },
    })
  })

  it("should execute query for entities", async () => {
    const reponse = await server.executeOperation({
      query: /* GraphQL */ `
        query ($representations: [_Any!]!) {
          _entities(representations: $representations) {
            ... on User {
              id
              name
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
        { id: "1", name: "@ava" },
        { id: "2", name: "@ava" },
      ],
    })
  })
})

describe("Yoga", () => {
  const schema = buildSubgraphSchema({ typeDefs, resolvers })
  const yoga = createYoga({ schema })

  it("should build schema", () => {
    expect(schema).toBeDefined()
  })
  it("should execute query", async () => {
    const response = await yoga.fetch("http://localhost/graphql", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          query {
            me {
              id
              name
            }
          }
        `,
      }),
    })

    if (response.status !== 200) throw new Error("unexpected")
    const json = await response.json()
    expect(json).toMatchObject({
      data: { me: { id: "1", name: "@ava" } },
    })
  })

  it("should execute query for entities", async () => {
    const response = await yoga.fetch("http://localhost/graphql", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        query: /* GraphQL */ `
          query ($representations: [_Any!]!) {
            _entities(representations: $representations) {
              ... on User {
                id
                name
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
      }),
    })

    if (response.status !== 200) throw new Error("unexpected")
    const json = await response.json()
    expect(json).toMatchObject({
      data: {
        _entities: [
          { id: "1", name: "@ava" },
          { id: "2", name: "@ava" },
        ],
      },
    })
  })
})

describe("Mercurius", () => {
  const app = Fastify()
  app.register(mercuriusFederationPlugin, {
    schema: typeDefs,
    resolvers,
  })
  const client = createMercuriusTestClient(app)

  it("should build schema", () => {
    expect(app.graphql.schema).toBeDefined()
  })

  it("should execute query", async () => {
    const response = await client.query(/* GraphQL */ `
      query {
        me {
          id
          name
        }
      }
    `)

    expect(response).toMatchObject({
      data: { me: { id: "1", name: "@ava" } },
    })
  })

  it("should execute query for entities", async () => {
    const response = await client.query(
      /* GraphQL */ `
        query ($representations: [_Any!]!) {
          _entities(representations: $representations) {
            ... on User {
              id
              name
            }
          }
        }
      `,
      {
        variables: {
          representations: [
            { __typename: "User", id: "1" },
            { __typename: "User", id: "2" },
          ],
        },
      }
    )
    expect(response).toMatchObject({
      data: {
        _entities: [
          { id: "1", name: "@ava" },
          { id: "2", name: "@ava" },
        ],
      },
    })
  })
})
