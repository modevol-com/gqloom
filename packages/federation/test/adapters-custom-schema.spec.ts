import { describe, expect, it } from "vitest"
import {
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  GraphQLUnionType,
  type GraphQLResolveInfo,
} from "graphql"
import { printSubgraphSchema } from "@apollo/subgraph"

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
          parent: Record<string, any>,
          context: object,
          info: GraphQLResolveInfo
        ) => Promise<object> | object
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
      extends: [{}],
      key: [{ fields: "id" }],
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
  }),
})

describe("schema", () => {
  it("should print Subgraph Schema", () => {
    expect(printSubgraphSchema(schema)).toMatchInlineSnapshot(`
      "type Query {
        me: User
      }

      type User {
        id: String
        name: String
      }"
    `)
  })
})
