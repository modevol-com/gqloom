import { type StandardSchemaV1, loom, weave } from "@gqloom/core"
import { ZodWeaver } from "@gqloom/zod"
import { printSchema, printType } from "graphql"
import { createYoga } from "graphql-yoga"
import { beforeEach, describe, expect, expectTypeOf, it } from "vitest"
import { z } from "zod"
import {
  type InferPrismaDelegate,
  type PrismaModelSilk,
  PrismaResolverFactory,
} from "../src"
import { PrismaClient } from "./client"
import * as g from "./generated"

const { resolver, query } = loom

class TestablePrismaModelBobbin<
  TModalSilk extends PrismaModelSilk<any, string, Record<string, any>>,
  TClient extends PrismaClient,
> extends PrismaResolverFactory<TModalSilk, TClient> {
  public uniqueWhere(
    instance: StandardSchemaV1.InferOutput<NonNullable<TModalSilk>>
  ): any {
    return super.uniqueWhere(instance)
  }

  name?: TModalSilk["name"]

  public get modelDelegate(): InferPrismaDelegate<TClient, TModalSilk["name"]> {
    return this.delegate
  }
}

describe("PrismaModelBobbin", () => {
  const db = new PrismaClient()

  it("should be able to create a bobbin", () => {
    const UserBobbin = new TestablePrismaModelBobbin(g.User, db)
    expect(UserBobbin).toBeDefined()
  })

  it("should be able to create a uniqueWhere condition", () => {
    const UserBobbin = new TestablePrismaModelBobbin(g.User, db)
    const userCondition = UserBobbin.uniqueWhere({
      id: 4,
      name: "",
      email: "",
    })
    expect(userCondition).toEqual({ id: 4 })

    const CatBobbin = new TestablePrismaModelBobbin(g.Cat, db)
    const catCondition = CatBobbin.uniqueWhere({
      firstName: "foo",
      lastName: "bar",
    })
    expect(catCondition).toEqual({
      firstName_lastName: { firstName: "foo", lastName: "bar" },
    })

    const DogBobbin = new TestablePrismaModelBobbin(g.Dog, db)
    const dogCondition = DogBobbin.uniqueWhere({
      firstName: "foo",
      lastName: "bar",
      height: 10,
      weight: 10,
      birthDate: new Date(),
    })
    expect(dogCondition).toEqual({
      fullName: {
        firstName: "foo",
        lastName: "bar",
      },
    })
  })

  describe("relationField", () => {
    const UserBobbin = new PrismaResolverFactory(g.User, db)
    const PostBobbin = new PrismaResolverFactory(g.Post, db)
    const r1 = resolver.of(g.User, {
      users: query(g.User.list(), () => db.user.findMany()),

      posts: UserBobbin.relationField("posts"),
    })

    const r2 = resolver.of(g.Post, {
      posts: query(g.Post.list(), () => db.post.findMany()),

      author: PostBobbin.relationField("author"),
    })
    const schema = weave(r1, r2)
    const yoga = createYoga({ schema })
    beforeEach(async () => {
      await db.user.deleteMany()
      await db.post.deleteMany()
      await db.user.create({
        data: {
          name: "John",
          email: "john@example.com",
          posts: {
            create: [{ title: "Hello World" }, { title: "Hello GQLoom" }],
          },
        },
      })
    })

    it("should be able to resolve a relationField", { retry: 6 }, async () => {
      const response = await yoga.fetch("http://localhost/graphql", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          query: /* GraphQL */ `
              query {
                users {
                  name
                  posts {
                    title
                  }
                }
                posts {
                  title
                  author {
                    name
                  }
                }
              }
            `,
        }),
      })

      if (response.status !== 200) throw new Error("unexpected")
      const json = await response.json()
      // if (!json?.data) return
      expect(json).toMatchObject({
        data: {
          users: [
            {
              name: "John",
              posts: [{ title: "Hello World" }, { title: "Hello GQLoom" }],
            },
          ],
          posts: [
            { title: "Hello World", author: { name: "John" } },
            { title: "Hello GQLoom", author: { name: "John" } },
          ],
        },
      })
    })

    it("should be able to create a relationField", () => {
      const postsField = UserBobbin.relationField("posts")
      expect(postsField).toBeDefined()
      expect(postsField.output).toBeTypeOf("object")
      expect(postsField.type).toEqual("field")
      expect(postsField.resolve).toBeTypeOf("function")

      const userField = PostBobbin.relationField("author")
      expect(userField).toBeDefined()
      expect(userField.output).toBeTypeOf("object")
      expect(userField.type).toEqual("field")
      expect(userField.resolve).toBeTypeOf("function")
    })

    it("should be able to weave user schema", () => {
      expect(printType(schema.getType("User")!)).toMatchInlineSnapshot(`
        "type User {
          id: ID!
          email: String!
          name: String
          posts: [Post!]!
        }"
      `)
    })
  })

  describe("countQuery", () => {
    const UserBobbin = new TestablePrismaModelBobbin(g.User, db)
    it("should be able to create a countQuery", () => {
      const q = UserBobbin.countQuery({
        middlewares: [
          async ({ next, parseInput }) => {
            const input = await parseInput()
            expectTypeOf(input).toEqualTypeOf<
              StandardSchemaV1.Result<
                NonNullable<Parameters<typeof db.user.count>[0]>
              >
            >()
            expectTypeOf(next).returns.resolves.toEqualTypeOf<number>()
            return next()
          },
        ],
      })

      expect(q).toBeDefined()
      expect(q.output).toBeTypeOf("object")
      expect(q.type).toEqual("query")
      expect(q.resolve).toBeTypeOf("function")
    })

    it("should be able to use custom input", () => {
      const UserWhereInput = z.object({
        __typename: z.literal("UserWhereInput"),
        name: z.string(),
      })

      const r = resolver.of(g.User, {
        countUser: UserBobbin.countQuery({
          input: z.object({
            where: UserWhereInput,
          }),
        }),
      })

      const schema = weave(ZodWeaver, r)
      expect(printSchema(schema)).toMatchInlineSnapshot(`
        "type User {
          id: ID!
          email: String!
          name: String
        }

        type Query {
          countUser(where: UserWhereInput!): Int!
        }

        input UserWhereInput {
          name: String!
        }"
      `)
    })
  })

  describe("findFirstQuery", async () => {
    const UserBobbin = new TestablePrismaModelBobbin(g.User, db)
    it("should be able to create a findFirstQuery", () => {
      const q = UserBobbin.findFirstQuery({
        middlewares: [
          async ({ next, parseInput }) => {
            const input = await parseInput()
            expectTypeOf(input).toEqualTypeOf<
              StandardSchemaV1.Result<
                NonNullable<Parameters<typeof db.user.findFirst>[0]>
              >
            >()
            expectTypeOf(next).returns.resolves.toEqualTypeOf<g.IUser | null>()
            return next()
          },
        ],
      })

      expect(q).toBeDefined()
      expect(q.output).toBeTypeOf("object")
      expect(q.type).toEqual("query")
      expect(q.resolve).toBeTypeOf("function")
    })

    it("should be able to use custom input", async () => {
      const UserWhereInput = z.object({
        __typename: z.literal("UserWhereInput"),
        name: z.string(),
      })

      const r = resolver.of(g.User, {
        findFirstUser: UserBobbin.findFirstQuery({
          input: z.object({
            where: UserWhereInput.optional(),
          }),
        }),
      })

      const schema = weave(ZodWeaver, r)
      expect(printSchema(schema)).toMatchInlineSnapshot(`
        "type User {
          id: ID!
          email: String!
          name: String
        }

        type Query {
          findFirstUser(where: UserWhereInput): User
        }

        input UserWhereInput {
          name: String!
        }"
      `)
    })
  })

  describe("findManyQuery", async () => {
    const UserBobbin = new TestablePrismaModelBobbin(g.User, db)

    it("should be able to create a findManyQuery", () => {
      const q = UserBobbin.findManyQuery({
        middlewares: [
          async ({ next, parseInput }) => {
            const input = await parseInput()
            expectTypeOf(input).toEqualTypeOf<
              StandardSchemaV1.Result<
                NonNullable<Parameters<typeof db.user.findMany>[0]>
              >
            >()
            expectTypeOf(next).returns.resolves.toEqualTypeOf<g.IUser[]>()
            return next()
          },
        ],
      })

      expect(q).toBeDefined()
      expect(q.output).toBeTypeOf("object")
      expect(q.type).toEqual("query")
      expect(q.resolve).toBeTypeOf("function")
    })

    it("should be able to use custom input", async () => {
      const UserWhereInput = z.object({
        __typename: z.literal("UserWhereInput"),
        name: z.string(),
      })

      const r = resolver.of(g.User, {
        findManyUser: UserBobbin.findManyQuery({
          input: z.object({
            where: UserWhereInput.optional(),
          }),
        }),
      })

      const schema = weave(ZodWeaver, r)
      expect(printSchema(schema)).toMatchInlineSnapshot(`
        "type User {
          id: ID!
          email: String!
          name: String
        }

        type Query {
          findManyUser(where: UserWhereInput): [User!]!
        }

        input UserWhereInput {
          name: String!
        }"
      `)
    })
  })

  describe("findUniqueQuery", async () => {
    const UserBobbin = new TestablePrismaModelBobbin(g.User, db)

    it("should be able to create a findUniqueQuery", () => {
      const q = UserBobbin.findUniqueQuery({
        middlewares: [
          async ({ next, parseInput }) => {
            const input = await parseInput()
            expectTypeOf(input).toEqualTypeOf<
              StandardSchemaV1.Result<
                NonNullable<Parameters<typeof db.user.findUnique>[0]>
              >
            >()
            expectTypeOf(next).returns.resolves.toEqualTypeOf<g.IUser | null>()
            return next()
          },
        ],
      })

      expect(q).toBeDefined()
      expect(q.output).toBeTypeOf("object")
      expect(q.type).toEqual("query")
      expect(q.resolve).toBeTypeOf("function")
    })

    it("should be able to use custom input", async () => {
      const UserWhereInput = z.object({
        __typename: z.literal("UserWhereInput"),
        id: z.number(),
      })

      const r = resolver.of(g.User, {
        findUniqueUser: UserBobbin.findUniqueQuery({
          input: z.object({
            where: UserWhereInput,
          }),
        }),
      })

      const schema = weave(ZodWeaver, r)
      expect(printSchema(schema)).toMatchInlineSnapshot(`
        "type User {
          id: ID!
          email: String!
          name: String
        }

        type Query {
          findUniqueUser(where: UserWhereInput!): User
        }

        input UserWhereInput {
          id: Float!
        }"
      `)
    })
  })

  describe("createMutation", async () => {
    const UserBobbin = new TestablePrismaModelBobbin(g.User, db)

    it("should be able to create a createMutation", () => {
      const m = UserBobbin.createMutation({
        middlewares: [
          async ({ next, parseInput }) => {
            const input = await parseInput()
            expectTypeOf(input).toEqualTypeOf<
              StandardSchemaV1.Result<
                NonNullable<Parameters<typeof db.user.create>[0]>
              >
            >()
            expectTypeOf(next).returns.resolves.toEqualTypeOf<g.IUser>()
            return next()
          },
        ],
      })

      expect(m).toBeDefined()
      expect(m.output).toBeTypeOf("object")
      expect(m.type).toEqual("mutation")
      expect(m.resolve).toBeTypeOf("function")
    })

    it("should be able to use custom input", async () => {
      const UserCreateInput = z.object({
        __typename: z.literal("UserCreateInput"),
        email: z.string(),
      })

      const r = resolver.of(g.User, {
        createUser: UserBobbin.createMutation({
          input: z.object({
            data: UserCreateInput,
          }),
        }),
      })

      const schema = weave(ZodWeaver, r)
      expect(printSchema(schema)).toMatchInlineSnapshot(`
        "type User {
          id: ID!
          email: String!
          name: String
        }

        type Mutation {
          createUser(data: UserCreateInput!): User
        }

        input UserCreateInput {
          email: String!
        }"
      `)
    })
  })

  describe("createManyMutation", async () => {
    const UserBobbin = new TestablePrismaModelBobbin(g.User, db)

    it("should be able to create a createManyMutation", () => {
      const m = UserBobbin.createManyMutation({
        middlewares: [
          async ({ next, parseInput }) => {
            const input = await parseInput()
            expectTypeOf(input).toEqualTypeOf<
              StandardSchemaV1.Result<
                NonNullable<Parameters<typeof db.user.createMany>[0]>
              >
            >()
            return next()
          },
        ],
      })

      expect(m).toBeDefined()
      expect(m.output).toBeTypeOf("object")
      expect(m.type).toEqual("mutation")
      expect(m.resolve).toBeTypeOf("function")
    })

    it("should be able to use custom input", async () => {
      const UserCreateManyInput = z.object({
        __typename: z.literal("UserCreateManyInput"),
        email: z.string(),
      })
      const r = resolver.of(g.User, {
        createManyUser: UserBobbin.createManyMutation({
          input: z.object({
            data: UserCreateManyInput.array(),
          }),
        }),
      })
      const schema = weave(ZodWeaver, r)
      expect(printSchema(schema)).toMatchInlineSnapshot(`
        "type User {
          id: ID!
          email: String!
          name: String
        }

        type Mutation {
          createManyUser(data: [UserCreateManyInput!]!): BatchPayload
        }

        type BatchPayload {
          count: Int!
        }

        input UserCreateManyInput {
          email: String!
        }"
      `)
    })
  })

  describe("deleteMutation", async () => {
    const UserBobbin = new TestablePrismaModelBobbin(g.User, db)

    it("should be able to create a deleteMutation", () => {
      const m = UserBobbin.deleteMutation({
        middlewares: [
          async ({ next, parseInput }) => {
            const input = await parseInput()
            expectTypeOf(input).toEqualTypeOf<
              StandardSchemaV1.Result<
                NonNullable<Parameters<typeof db.user.delete>[0]>
              >
            >()
            return next()
          },
        ],
      })

      expect(m).toBeDefined()
      expect(m.output).toBeTypeOf("object")
      expect(m.type).toEqual("mutation")
      expect(m.resolve).toBeTypeOf("function")
    })

    it("should be able to use custom input", async () => {
      const UserDeleteInput = z.object({
        __typename: z.literal("UserDeleteInput"),
        email: z.string(),
      })

      const r = resolver.of(g.User, {
        deleteUser: UserBobbin.deleteMutation({
          input: z.object({
            where: UserDeleteInput,
          }),
        }),
      })

      const schema = weave(ZodWeaver, r)
      expect(printSchema(schema)).toMatchInlineSnapshot(`
        "type User {
          id: ID!
          email: String!
          name: String
        }

        type Mutation {
          deleteUser(where: UserDeleteInput!): User
        }

        input UserDeleteInput {
          email: String!
        }"
      `)
    })
  })

  describe("deleteManyMutation", async () => {
    const UserBobbin = new TestablePrismaModelBobbin(g.User, db)

    it("should be able to create a deleteManyMutation", async () => {
      const m = UserBobbin.deleteManyMutation({
        middlewares: [
          async ({ next, parseInput }) => {
            const input = await parseInput()
            expectTypeOf(input).toEqualTypeOf<
              StandardSchemaV1.Result<
                NonNullable<Parameters<typeof db.user.deleteMany>[0]>
              >
            >()
            return next()
          },
        ],
      })

      expect(m).toBeDefined()
      expect(m.output).toBeTypeOf("object")
      expect(m.type).toEqual("mutation")
      expect(m.resolve).toBeTypeOf("function")
    })
    it("should be able to use custom input", async () => {
      const UserDeleteManyInput = z.object({
        __typename: z.literal("UserDeleteManyInput"),
        email: z.string(),
      })

      const r = resolver.of(g.User, {
        deleteManyUser: UserBobbin.deleteManyMutation({
          input: z.object({
            where: UserDeleteManyInput,
          }),
        }),
      })

      const schema = weave(ZodWeaver, r)
      expect(printSchema(schema)).toMatchInlineSnapshot(`
        "type User {
          id: ID!
          email: String!
          name: String
        }

        type Mutation {
          deleteManyUser(where: UserDeleteManyInput!): BatchPayload
        }

        type BatchPayload {
          count: Int!
        }

        input UserDeleteManyInput {
          email: String!
        }"
      `)
    })
  })

  describe("updateMutation", async () => {
    const UserBobbin = new TestablePrismaModelBobbin(g.User, db)

    it("should be able to create a deleteMutation", async () => {
      const m = UserBobbin.updateMutation({
        middlewares: [
          async ({ next, parseInput }) => {
            const input = await parseInput()
            expectTypeOf(input).toEqualTypeOf<
              StandardSchemaV1.Result<
                NonNullable<Parameters<typeof db.user.update>[0]>
              >
            >()
            return next()
          },
        ],
      })

      expect(m).toBeDefined()
      expect(m.output).toBeTypeOf("object")
      expect(m.type).toEqual("mutation")
      expect(m.resolve).toBeTypeOf("function")
    })

    it("should be able to use custom input", async () => {
      const UserUpdateInput = z.object({
        __typename: z.literal("UserUpdateInput"),
        email: z.string(),
      })

      const UserWhereInput = z.object({
        __typename: z.literal("UserWhereInput"),
        email: z.string(),
      })

      const r = resolver.of(g.User, {
        updateUser: UserBobbin.updateMutation({
          input: z.object({
            data: UserUpdateInput,
            where: UserWhereInput,
          }),
        }),
      })

      const schema = weave(ZodWeaver, r)
      expect(printSchema(schema)).toMatchInlineSnapshot(`
        "type User {
          id: ID!
          email: String!
          name: String
        }

        type Mutation {
          updateUser(data: UserUpdateInput!, where: UserWhereInput!): User!
        }

        input UserUpdateInput {
          email: String!
        }

        input UserWhereInput {
          email: String!
        }"
      `)
    })
  })

  describe("updateManyMutation", async () => {
    const UserBobbin = new TestablePrismaModelBobbin(g.User, db)

    it("should be able to create a deleteMutation", async () => {
      const m = UserBobbin.updateManyMutation({
        middlewares: [
          async ({ next, parseInput }) => {
            const input = await parseInput()
            expectTypeOf(input).toEqualTypeOf<
              StandardSchemaV1.Result<
                NonNullable<Parameters<typeof db.user.updateMany>[0]>
              >
            >()
            return next()
          },
        ],
      })

      expect(m).toBeDefined()
      expect(m.output).toBeTypeOf("object")
      expect(m.type).toEqual("mutation")
      expect(m.resolve).toBeTypeOf("function")
    })

    it("should be able to use custom input", async () => {
      const UserUpdateManyInput = z.object({
        __typename: z.literal("UserUpdateManyInput"),
        email: z.string(),
      })

      const UserWhereInput = z.object({
        __typename: z.literal("UserWhereInput"),
        email: z.string(),
      })

      const r = resolver.of(g.User, {
        updateManyUser: UserBobbin.updateManyMutation({
          input: z.object({
            data: UserUpdateManyInput,
            where: UserWhereInput,
          }),
        }),
      })

      const schema = weave(ZodWeaver, r)
      expect(printSchema(schema)).toMatchInlineSnapshot(`
        "type User {
          id: ID!
          email: String!
          name: String
        }

        type Mutation {
          updateManyUser(data: UserUpdateManyInput!, where: UserWhereInput!): BatchPayload
        }

        type BatchPayload {
          count: Int!
        }

        input UserUpdateManyInput {
          email: String!
        }

        input UserWhereInput {
          email: String!
        }"
      `)
    })
  })

  describe("upsertMutation", async () => {
    const UserBobbin = new TestablePrismaModelBobbin(g.User, db)

    it("should be able to create a deleteMutation", async () => {
      const m = UserBobbin.upsertMutation({
        middlewares: [
          async ({ next, parseInput }) => {
            const input = await parseInput()
            expectTypeOf(input).toEqualTypeOf<
              StandardSchemaV1.Result<
                NonNullable<Parameters<typeof db.user.upsert>[0]>
              >
            >()
            return next()
          },
        ],
      })

      expect(m).toBeDefined()
      expect(m.output).toBeTypeOf("object")
      expect(m.type).toEqual("mutation")
      expect(m.resolve).toBeTypeOf("function")
    })

    it("should be able to use custom input", async () => {
      const UserUpsertInput = z.object({
        __typename: z.literal("UserUpsertInput"),
        email: z.string(),
      })

      const UserWhereUniqueInput = z.object({
        __typename: z.literal("UserWhereUniqueInput"),
        email: z.string(),
      })

      const r = resolver.of(g.User, {
        upsertUser: UserBobbin.upsertMutation({
          input: z.object({
            where: UserWhereUniqueInput,
            create: UserUpsertInput,
            update: UserUpsertInput,
          }),
        }),
      })

      const schema = weave(ZodWeaver, r)
      expect(printSchema(schema)).toMatchInlineSnapshot(`
        "type User {
          id: ID!
          email: String!
          name: String
        }

        type Mutation {
          upsertUser(where: UserWhereUniqueInput!, create: UserUpsertInput!, update: UserUpsertInput!): User!
        }

        input UserWhereUniqueInput {
          email: String!
        }

        input UserUpsertInput {
          email: String!
        }"
      `)
    })
  })
})
