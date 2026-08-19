import { ApolloServer } from "@apollo/server"
import { ApolloServerPluginInlineTraceDisabled } from "@apollo/server/plugin/disabled"
import {
  field,
  query,
  type RequireKeys,
  type ResolvingFields,
  silk,
} from "@gqloom/core"
import {
  asyncContextProvider,
  createContext,
  useResolvingFields,
} from "@gqloom/core/context"
import {
  GraphQLInt,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from "graphql"
import { describe, expect, expectTypeOf, it } from "vitest"
import { FederatedSchemaLoom, resolveReference, resolver } from "../src"

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

  describe("field with dependencies", () => {
    type ISelectiveGiraffe = {
      name?: string
      birthday?: Date
    }
    const SelectiveGiraffe = silk<ISelectiveGiraffe>(
      new GraphQLObjectType<ISelectiveGiraffe>({
        name: "SelectiveGiraffe",
        fields: {
          name: { type: GraphQLString },
          birthday: { type: GraphQLString },
        },
      })
    )
    const selectiveResolver = resolver.of(SelectiveGiraffe, {
      age: field(silk<number>(GraphQLInt), {
        dependencies: ["birthday"] as ["birthday"],
        resolve: async (giraffe) => {
          it("should infer parent type", () => {
            expectTypeOf(giraffe).toEqualTypeOf<
              RequireKeys<ISelectiveGiraffe, "birthday">
            >()
            expectTypeOf<
              RequireKeys<ISelectiveGiraffe, "birthday">
            >().toEqualTypeOf<
              { birthday: Date } & { name?: string | undefined }
            >()
          })
          return new Date().getFullYear() - giraffe.birthday.getFullYear()
        },
        middlewares: [
          async ({ parent, next }) => {
            it("should infer parent type", () => {
              expectTypeOf(parent).toEqualTypeOf<
                RequireKeys<ISelectiveGiraffe, "birthday">
              >()
            })
            return next()
          },
        ],
      }),

      age1: field(silk<number>(GraphQLInt))
        .derivedFrom("birthday")
        .resolve(async (giraffe) => {
          it("should infer parent type", () => {
            expectTypeOf(giraffe).toEqualTypeOf<
              RequireKeys<ISelectiveGiraffe, "birthday">
            >()
          })
          return new Date().getFullYear() - giraffe.birthday.getFullYear()
        }),
    })

    it("should infer input type", () => {
      expectTypeOf(selectiveResolver["~meta"].fields.age["~meta"].resolve)
        .parameter(0)
        .toEqualTypeOf<ISelectiveGiraffe>()
    })

    it("should infer output type", () => {
      expectTypeOf(
        selectiveResolver["~meta"].fields.age["~meta"].resolve
      ).returns.resolves.toEqualTypeOf<number>()
    })
  })

  describe("loadReference", () => {
    interface IUser {
      id: string
      name: string
      email?: string
      phone?: string
    }
    const User = silk<IUser>(
      new GraphQLObjectType({
        name: "User",
        fields: {
          id: { type: new GraphQLNonNull(GraphQLString) },
          name: { type: new GraphQLNonNull(GraphQLString) },
          email: { type: GraphQLString },
          phone: { type: GraphQLString },
        },
        extensions: {
          directives: { key: { fields: "id", resolvable: true } },
        },
      })
    )

    it("should load references in batch", async () => {
      const userResolver = resolver
        .of(User, {
          query: query(silk(GraphQLString), () => "foo"),
        })
        .loadReference<"id">(async (sources) => {
          // Verify the types of sources
          expectTypeOf(sources).toEqualTypeOf<RequireKeys<IUser, "id">[]>()

          // Return mock data for the sources
          return sources.map((source) => ({
            id: source.id,
            name: `User ${source.id}`,
          }))
        })

      // Apollo Server + FederatedSchemaLoom
      const schema = FederatedSchemaLoom.weave(userResolver)
      const server = new ApolloServer({
        schema,
        plugins: [ApolloServerPluginInlineTraceDisabled()],
      })

      // _entities 查询
      const entitiesQuery = `
        query Entities($reps: [_Any!]!) {
          _entities(representations: $reps) {
            ... on User {
              id
              name
            }
          }
        }
      `
      const variables = {
        reps: [
          { __typename: "User", id: "1" },
          { __typename: "User", id: "2" },
        ],
      }
      const response = await server.executeOperation({
        query: entitiesQuery,
        variables,
      })
      if (response.body.kind !== "single") throw new Error("unexpected")
      expect(response.body.singleResult.data?._entities).toEqual([
        { id: "1", name: "User 1" },
        { id: "2", name: "User 2" },
      ])
    })

    it("should handle single reference", async () => {
      const userResolver = resolver
        .of(User, {
          query: query(silk(GraphQLString), () => "foo"),
        })
        .loadReference<"id">(async (sources) => {
          // 兼容 sources 里带 __typename 字段的情况
          expect(sources).toEqual([expect.objectContaining({ id: "1" })])
          return sources.map((source) => ({
            id: source.id,
            name: `User ${source.id}`,
          }))
        })

      // Apollo Server + FederatedSchemaLoom
      const schema = FederatedSchemaLoom.weave(userResolver)
      const server = new ApolloServer({
        schema,
        plugins: [ApolloServerPluginInlineTraceDisabled()],
      })

      // _entities 查询
      const entitiesQuery = /* GraphQL */ `
        query Entities($reps: [_Any!]!) {
          _entities(representations: $reps) {
            ... on User {
              id
              name
            }
          }
        }
      `
      const variables = {
        reps: [{ __typename: "User", id: "1" }],
      }
      const response = await server.executeOperation({
        query: entitiesQuery,
        variables,
      })
      if (response.body.kind !== "single") throw new Error("unexpected")
      expect(response.body.singleResult.data?._entities).toEqual([
        { id: "1", name: "User 1" },
      ])
    })

    it("should work with useResolvingFields", async () => {
      let resolvingFields: ResolvingFields | undefined

      const userResolver = resolver
        .of(User, {
          query: query(silk(GraphQLString), () => "foo"),
        })
        .loadReference<"id">(async (sources) => {
          // Get current resolving fields using useResolvingFields
          resolvingFields = useResolvingFields()

          // Return data based on requested fields
          return sources.map((source) => {
            const user: IUser = {
              id: source.id,
              name: `User ${source.id}`,
            }

            // Add email if requested
            if (resolvingFields?.requestedFields.has("email")) {
              user.email = `user${source.id}@example.com`
            }

            // Add phone if requested
            if (resolvingFields?.requestedFields.has("phone")) {
              user.phone = `123-${source.id}`
            }

            return user
          })
        })

      // Apollo Server + FederatedSchemaLoom
      const schema = FederatedSchemaLoom.weave(
        asyncContextProvider,
        userResolver
      )
      const server = new ApolloServer({
        schema,
        plugins: [ApolloServerPluginInlineTraceDisabled()],
      })

      // Test basic fields only
      const basicQuery = /* GraphQL */ `
        query Entities($reps: [_Any!]!) {
          _entities(representations: $reps) {
            ... on User {
              id
              name
            }
          }
        }
      `
      const basicResponse = await server.executeOperation({
        query: basicQuery,
        variables: {
          reps: [{ __typename: "User", id: "1" }],
        },
      })
      if (basicResponse.body.kind !== "single") throw new Error("unexpected")
      expect(basicResponse.body.singleResult.data?._entities).toEqual([
        { id: "1", name: "User 1" },
      ])
      expect(resolvingFields).toMatchObject({
        requestedFields: new Set(["id", "name"]),
        derivedFields: new Set([]),
        derivedDependencies: new Set([]),
        selectedFields: new Set(["id", "name"]),
      })

      // Test with additional fields
      const extendedQuery = /* GraphQL */ `
        query Entities($reps: [_Any!]!) {
          _entities(representations: $reps) {
            ... on User {
              id
              name
              email
              phone
            }
          }
        }
      `
      const extendedResponse = await server.executeOperation({
        query: extendedQuery,
        variables: {
          reps: [{ __typename: "User", id: "1" }],
        },
      })
      if (extendedResponse.body.kind !== "single") throw new Error("unexpected")
      expect(extendedResponse.body.singleResult.data?._entities).toEqual([
        {
          id: "1",
          name: "User 1",
          email: "user1@example.com",
          phone: "123-1",
        },
      ])
      expect(resolvingFields).toMatchObject({
        requestedFields: new Set(["id", "name", "email", "phone"]),
        derivedFields: new Set([]),
        derivedDependencies: new Set([]),
        selectedFields: new Set(["id", "name", "email", "phone"]),
      })
    })
  })
})

describe("FederatedChainResolver.toExecutor", () => {
  interface IUser {
    id: string
    name: string
    email?: string
  }

  const User = silk<IUser>(
    new GraphQLObjectType({
      name: "User",
      fields: {
        id: { type: new GraphQLNonNull(GraphQLString) },
        name: { type: new GraphQLNonNull(GraphQLString) },
        email: { type: GraphQLString },
      },
      extensions: {
        directives: { key: { fields: "id", resolvable: true } },
      },
    })
  )

  it("should work with basic resolver", async () => {
    const userResolver = resolver.of(User, {
      query: query(silk(GraphQLString), () => "foo"),
    })

    const executor = userResolver.toExecutor()
    const result = await executor.query()
    expect(result).toBe("foo")
  })

  it("should work with resolveReference", async () => {
    const userResolver = resolver
      .of(User, {
        query: query(silk(GraphQLString), () => "foo"),
      })
      .resolveReference<"id">(({ id }) => ({
        id,
        name: `User ${id}`,
        email: undefined,
      }))

    const executor = userResolver.toExecutor()
    const result = await executor.$resolveReference({ id: "1" })
    expect(result).toEqual({
      id: "1",
      name: "User 1",
      email: undefined,
    })
  })

  it("should work with middlewares", async () => {
    const logs: string[] = []
    const userResolver = resolver
      .of(User, {
        query: query(silk(GraphQLString), () => "foo"),
      })
      .use(async (next) => {
        logs.push("before")
        const result = await next()
        logs.push("after")
        return result
      })

    const executor = userResolver.toExecutor()
    await executor.query()
    expect(logs).toEqual(["before", "after"])
  })

  it("should work with context", async () => {
    const useDefaultName = createContext(() => "Default User")
    const userResolver = resolver.of(User, {
      query: query(silk(GraphQLString), () => useDefaultName()),
    })

    const executor = userResolver.toExecutor(
      asyncContextProvider.with(useDefaultName.provide(() => "Custom User"))
    )
    const result = await executor.query()
    expect(result).toBe("Custom User")
  })
})
