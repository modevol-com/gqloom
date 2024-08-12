import { loom, silk } from "@gqloom/core"
import { describe, expect, it } from "vitest"
import { resolveReference, FederatedSchemaWeaver } from "../src"
import {
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
  lexicographicSortSchema,
  printSchema,
} from "graphql"
import { printSubgraphSchema } from "@apollo/subgraph"

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
        directives: {
          key: { fields: "id", resolvable: true },
        },
        ...resolveReference<IUser, "id">(({ id }) => ({ id, name: "@ava" })),
      },
    })
  )

  const r1 = loom.resolver({
    me: loom.query(User, () => ({ id: "1", name: "@ava" })),
  })

  const schema = FederatedSchemaWeaver.weave(
    r1,
    FederatedSchemaWeaver.config({
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
})
