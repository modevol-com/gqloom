import { ApolloServer } from "@apollo/server"
import { ApolloServerPluginInlineTraceDisabled } from "@apollo/server/plugin/disabled"
import { buildSubgraphSchema } from "@apollo/subgraph"
import { mercuriusFederationPlugin } from "@mercuriusjs/federation"
import Fastify from "fastify"
import gql from "graphql-tag"
import { createYoga } from "graphql-yoga"
import { createMercuriusTestClient } from "mercurius-integration-testing"
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

const queries = {
  me: /* GraphQL */ `
    query me {
      me {
        id
        name
      }
    }
  `,
  entities: /* GraphQL */ `
    query entities($representations: [_Any!]!) {
      _entities(representations: $representations) {
        ... on User {
          id
          name
        }
      }
    }
  `,
  subgraphSchema: /* GraphQL */ `
    query subgraphSchema {
      _service {
        sdl
      }
    }
  `,
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
    const response = await server.executeOperation({
      query: queries.me,
    })

    if (response.body.kind !== "single") throw new Error("unexpected")
    expect(response.body.singleResult.data).toMatchObject({
      me: { id: "1", name: "@ava" },
    })
  })

  it("should execute query for entities", async () => {
    const response = await server.executeOperation({
      query: queries.entities,
      variables: {
        representations: [
          { __typename: "User", id: "1" },
          { __typename: "User", id: "2" },
        ],
      },
    })

    if (response.body.kind !== "single") throw new Error("unexpected")
    expect(response.body.singleResult.data).toMatchObject({
      _entities: [
        { id: "1", name: "@ava" },
        { id: "2", name: "@ava" },
      ],
    })
  })

  it("should introspect Subgraph Schema", async () => {
    const response = await server.executeOperation({
      query: queries.subgraphSchema,
    })

    if (response.body.kind !== "single") throw new Error("unexpected")
    expect(
      (response.body.singleResult.data as unknown as SubgraphSchemaData)
        ._service.sdl
    ).toMatch("type Query")
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
        query: queries.me,
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
        query: queries.entities,
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

  it("should introspect Subgraph Schema", async () => {
    const response = await yoga.fetch("http://localhost/graphql", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        query: queries.subgraphSchema,
      }),
    })
    if (response.status !== 200) throw new Error("unexpected")
    const json = await response.json()
    expect((json.data as unknown as SubgraphSchemaData)._service.sdl).toMatch(
      "type Query"
    )
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
    const response = await client.query(queries.me)

    expect(response).toMatchObject({
      data: { me: { id: "1", name: "@ava" } },
    })
  })

  it("should execute query for entities", async () => {
    const response = await client.query(queries.entities, {
      variables: {
        representations: [
          { __typename: "User", id: "1" },
          { __typename: "User", id: "2" },
        ],
      },
    })
    expect(response).toMatchObject({
      data: {
        _entities: [
          { id: "1", name: "@ava" },
          { id: "2", name: "@ava" },
        ],
      },
    })
  })

  it("should introspect Subgraph Schema", async () => {
    const response = await client.query(queries.subgraphSchema)

    const sdl = (response.data as unknown as SubgraphSchemaData)._service.sdl
    expect(sdl).toMatch("type Query")
  })
})

interface SubgraphSchemaData {
  _service: {
    sdl: string
  }
}
