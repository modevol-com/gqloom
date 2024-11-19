import { ApolloServer } from "@apollo/server"
import { ApolloServerPluginInlineTraceDisabled } from "@apollo/server/plugin/disabled"
import { printSubgraphSchema } from "@apollo/subgraph"
import { entitiesField } from "@apollo/subgraph/dist/types"
import type { MayPromise } from "@gqloom/core"
import { printSchemaWithDirectives } from "@graphql-tools/utils"
import Fastify from "fastify"
import {
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  type GraphQLResolveInfo,
  GraphQLSchema,
  GraphQLString,
  GraphQLUnionType,
} from "graphql"
import { createYoga } from "graphql-yoga"
import Mercurius from "mercurius"
import { createMercuriusTestClient } from "mercurius-integration-testing"
import { describe, expect, it } from "vitest"
import { mockAst } from "../src/mock-ast"

declare module "graphql" {
  export interface GraphQLObjectTypeExtensions {
    directives?:
      | {
          name: string
          args: Record<string, any>
        }[]
      | Record<string, Record<string, any>>

    apollo?: {
      subgraph?: {
        resolveReference?: (
          parent: any,
          context: object,
          info: GraphQLResolveInfo
        ) => MayPromise<object | null | undefined>
      }
    }
  }
}

const User = new GraphQLObjectType({
  name: "User",
  fields: {
    id: { type: GraphQLString },
    name: { type: GraphQLString },
  },
  extensions: {
    directives: {
      extends: {},
      key: { fields: "id" },
    },
    apollo: {
      subgraph: {
        resolveReference: (parent) => {
          return {
            id: parent.id,
            name: "@ava",
          }
        },
      },
    },
  },
})

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: "Query",
    fields: {
      me: {
        type: User,
        resolve: () => ({ id: "1", name: "@ava" }),
      },
      _entities: {
        ...entitiesField,
        type: new GraphQLNonNull(
          new GraphQLList(
            new GraphQLUnionType({
              name: "_Entity",
              types: [User],
            })
          )
        ),
      },
      _service: {
        type: new GraphQLObjectType({
          name: "_Service",
          fields: {
            sdl: { type: GraphQLString },
          },
        }),
        resolve(): { sdl: string } {
          return { sdl: printSubgraphSchema(schema) }
        },
      },
    },
  }),
  extensions: {
    directives: {
      link: [
        {
          url: "https://specs.apollo.dev/federation/v2.6",
          import: [
            "@extends",
            "@external",
            "@inaccessible",
            "@key",
            "@override",
            "@provides",
            "@shareable",
            "@tag",
          ],
        },
      ],
    },
  },
})

mockAst(schema)

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

describe("schema", () => {
  it("should print Subgraph Schema", () => {
    expect(printSubgraphSchema(schema)).toMatchInlineSnapshot(`
      "extend schema
        @link(url: "https://specs.apollo.dev/federation/v2.6", import: ["@extends", "@external", "@inaccessible", "@key", "@override", "@provides", "@shareable", "@tag"])

      type Query {
        me: User
      }

      type User
        @extends
        @key(fields: "id")
      {
        id: String
        name: String
      }"
    `)
  })

  it("should print Schema with Directives", () => {
    expect(printSchemaWithDirectives(schema)).toMatchInlineSnapshot(`
      "schema @link(url: "https://specs.apollo.dev/federation/v2.6", import: ["@extends", "@external", "@inaccessible", "@key", "@override", "@provides", "@shareable", "@tag"]) {
        query: Query
      }

      type Query {
        me: User
        _entities(representations: [_Any!]!): [_Entity]!
        _service: _Service
      }

      type User @extends @key(fields: "id") {
        id: String
        name: String
      }

      union _Entity = User

      scalar _Any

      type _Service {
        sdl: String
      }"
    `)
  })
})

describe("Apollo", () => {
  const server = new ApolloServer({
    schema,
    plugins: [ApolloServerPluginInlineTraceDisabled()],
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
})

describe("Yoga", () => {
  const yoga = createYoga({ schema })

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
})

describe("Mercurius", () => {
  const app = Fastify()
  app.register(Mercurius, { schema })
  const client = createMercuriusTestClient(app)

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
})
