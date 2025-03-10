import { ApolloServer } from "@apollo/server"
import { ApolloServerPluginInlineTraceDisabled } from "@apollo/server/plugin/disabled"
import { printSubgraphSchema } from "@apollo/subgraph"
import { loom, silk } from "@gqloom/core"
import {
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
  lexicographicSortSchema,
  printSchema,
} from "graphql"
import { describe, expect, it } from "vitest"
import { FederatedSchemaLoom, resolveReference, resolver } from "../src"

describe("FederatedSchemaWeaver", () => {
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

  const r1 = loom.resolver.of(
    User,
    {
      me: loom.query(User, () => ({ id: "1", name: "@ava" })),
    },
    {
      extensions: {
        directives: [{ name: "key", args: { fields: "id", resolvable: true } }],
        ...resolveReference<IUser, "id">(({ id }) => ({ id, name: "@ava" })),
      },
    }
  )

  const r2 = resolver
    .of(User, {
      me: loom.query(User, () => ({ id: "2", name: "@ava" })),
    })
    .directives({ key: { fields: "id", resolvable: true } })
    .resolveReference(({ id }) => ({ id, name: "@ava" }))

  const schema = FederatedSchemaLoom.weave(
    r1,
    FederatedSchemaLoom.config({
      extensions: {
        directives: {
          link: [
            {
              url: "https://specs.apollo.dev/federation/v2.6",
              import: ["@extends", "@external", "@key", "@shareable"],
            },
          ],
        },
      },
    })
  )

  const schema2 = FederatedSchemaLoom.weave(
    r2,
    FederatedSchemaLoom.config({
      extensions: {
        directives: {
          link: [
            {
              url: "https://specs.apollo.dev/federation/v2.6",
              import: ["@extends", "@external", "@key", "@shareable"],
            },
          ],
        },
      },
    })
  )
  it("should weave a federated schema", () => {
    const federatedSdl = printSubgraphSchema(lexicographicSortSchema(schema))
    const federatedSdl2 = printSubgraphSchema(lexicographicSortSchema(schema2))

    expect(federatedSdl2).toEqual(federatedSdl)
    expect(federatedSdl).toMatchInlineSnapshot(`
      "extend schema
        @link(url: "https://specs.apollo.dev/federation/v2.6", import: ["@extends", "@external", "@key", "@shareable"])

      type Query {
        me: User
      }

      type User
        @key(fields: "id", resolvable: true)
      {
        id: String!
        name: String!
      }"
    `)
  })

  it("should be able to print by graphql.js", () => {
    const sdl = printSchema(lexicographicSortSchema(schema))
    const sdl2 = printSchema(lexicographicSortSchema(schema2))
    expect(sdl2).toEqual(sdl)
    expect(sdl).toMatchInlineSnapshot(`
      "type Query {
        _entities(representations: [_Any!]!): [_Entity]!
        _service: _Service
        me: User
      }

      type User {
        id: String!
        name: String!
      }

      scalar _Any

      union _Entity = User

      type _Service {
        """
        The sdl representing the federated service capabilities. Includes federation directives, removes federation types, and includes rest of full schema after schema directives have been applied
        """
        sdl: String
      }"
    `)
  })

  describe("Federated GraphQL Server", () => {
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
    const server = new ApolloServer({
      schema,
      plugins: [ApolloServerPluginInlineTraceDisabled()],
    })

    const server2 = new ApolloServer({
      schema: schema2,
      plugins: [ApolloServerPluginInlineTraceDisabled()],
    })
    it("should execute normal query", async () => {
      let response = await server.executeOperation({
        query: queries.me,
      })

      if (response.body.kind !== "single") throw new Error("unexpected")

      expect(response.body.singleResult.data).toMatchObject({
        me: { id: "1", name: "@ava" },
      })

      response = await server2.executeOperation({
        query: queries.me,
      })

      if (response.body.kind !== "single") throw new Error("unexpected")

      expect(response.body.singleResult.data).toMatchObject({
        me: { id: "2", name: "@ava" },
      })
    })

    it("should execute query for entities", async () => {
      let response
      response = await server.executeOperation({
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
      response = await server2.executeOperation({
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
      const sdlFromResponse = (
        response.body.singleResult.data as unknown as {
          _service: { sdl: string }
        }
      )._service.sdl
      expect(sdlFromResponse).toMatch("type Query")
      expect(sdlFromResponse).toEqual(
        printSubgraphSchema(lexicographicSortSchema(schema))
      )
    })
  })
})
