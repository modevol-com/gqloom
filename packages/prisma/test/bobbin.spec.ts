import { describe, it, expect, beforeEach, expectTypeOf } from "vitest"
import * as g from "./generated"
import { PrismaClient } from "@prisma/client"
import {
  type InferPrismaDelegate,
  PrismaModelBobbin,
  type PrismaModelSilk,
} from "../src"
import { type InferSilkO, loom, weave } from "@gqloom/core"
import { zodSilk, asInputArgs } from "@gqloom/zod"
import { z } from "zod"
import { createYoga } from "graphql-yoga"
import { printSchema } from "graphql"

const { resolver, query } = loom

class TestablePrismaModelBobbin<
  TModalSilk extends PrismaModelSilk<any, string, Record<string, any>>,
  TClient extends PrismaClient,
> extends PrismaModelBobbin<TModalSilk, TClient> {
  public uniqueWhere(instance: InferSilkO<NonNullable<TModalSilk>>): any {
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
    beforeEach(async () => {
      await db.user.deleteMany()
      await db.post.deleteMany()
    })
    const UserBobbin = new PrismaModelBobbin(g.User, db)
    const PostBobbin = new PrismaModelBobbin(g.Post, db)
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

    it("should be able to resolve a relationField", async () => {
      await db.user.create({
        data: {
          name: "John",
          email: "john@example.com",
          posts: {
            create: [{ title: "Hello World" }, { title: "Hello GQLoom" }],
          },
        },
      })

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
  })

  describe("countQuery", () => {
    const UserBobbin = new TestablePrismaModelBobbin(g.User, db)
    it("should be able to create a countQuery", () => {
      const q = UserBobbin.countQuery({
        middlewares: [
          async (next, { parseInput }) => {
            const input = await parseInput()
            expectTypeOf(input).toEqualTypeOf<
              NonNullable<Parameters<typeof db.user.count>[0]>
            >()
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
          input: zodSilk(
            z
              .object({
                where: UserWhereInput,
              })
              .superRefine(asInputArgs())
          ),
        }),
      })

      const schema = weave(r)
      expect(printSchema(schema)).toMatchInlineSnapshot(`
        "type Query {
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
          async (next, { parseInput }) => {
            const input = await parseInput()
            expectTypeOf(input).toEqualTypeOf<
              NonNullable<Parameters<typeof db.user.findFirst>[0]>
            >()
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
          input: zodSilk.input({
            where: UserWhereInput.optional(),
          }),
        }),
      })

      const schema = weave(r)
      expect(printSchema(schema)).toMatchInlineSnapshot(`
        "type Query {
          findFirstUser(where: UserWhereInput): User
        }

        type User {
          id: ID!
          email: String!
          name: String
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
          async (next, { parseInput }) => {
            const input = await parseInput()
            expectTypeOf(input).toEqualTypeOf<
              NonNullable<Parameters<typeof db.user.findMany>[0]>
            >()
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
          input: zodSilk.input({
            where: UserWhereInput.optional(),
          }),
        }),
      })

      const schema = weave(r)
      expect(printSchema(schema)).toMatchInlineSnapshot(`
        "type Query {
          findManyUser(where: UserWhereInput): [User!]!
        }

        type User {
          id: ID!
          email: String!
          name: String
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
          async (next, { parseInput }) => {
            const input = await parseInput()
            expectTypeOf(input).toEqualTypeOf<
              NonNullable<Parameters<typeof db.user.findUnique>[0]>
            >()
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
          input: zodSilk.input({
            where: UserWhereInput,
          }),
        }),
      })

      const schema = weave(r)
      expect(printSchema(schema)).toMatchInlineSnapshot(`
        "type Query {
          findUniqueUser(where: UserWhereInput!): User
        }

        type User {
          id: ID!
          email: String!
          name: String
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
          async (next, { parseInput }) => {
            const input = await parseInput()
            expectTypeOf(input).toEqualTypeOf<
              NonNullable<Parameters<typeof db.user.create>[0]>
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
      const UserCreateInput = z.object({
        __typename: z.literal("UserCreateInput"),
        email: z.string(),
      })

      const r = resolver.of(g.User, {
        createUser: UserBobbin.createMutation({
          input: zodSilk.input({
            data: UserCreateInput,
          }),
        }),
      })

      const schema = weave(r)
      expect(printSchema(schema)).toMatchInlineSnapshot(`
        "type Mutation {
          createUser(data: UserCreateInput!): User
        }

        type User {
          id: ID!
          email: String!
          name: String
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
          async (next, { parseInput }) => {
            const input = await parseInput()
            expectTypeOf(input).toEqualTypeOf<
              NonNullable<Parameters<typeof db.user.createMany>[0]>
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
          input: zodSilk.input({
            data: UserCreateManyInput.array(),
          }),
        }),
      })
      const schema = weave(r)
      expect(printSchema(schema)).toMatchInlineSnapshot(`
        "type Mutation {
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
          async (next, { parseInput }) => {
            const input = await parseInput()
            expectTypeOf(input).toEqualTypeOf<
              NonNullable<Parameters<typeof db.user.delete>[0]>
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
          input: zodSilk.input({
            where: UserDeleteInput,
          }),
        }),
      })

      const schema = weave(r)
      expect(printSchema(schema)).toMatchInlineSnapshot(`
        "type Mutation {
          deleteUser(where: UserDeleteInput!): User
        }

        type User {
          id: ID!
          email: String!
          name: String
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
          async (next, { parseInput }) => {
            const input = await parseInput()
            expectTypeOf(input).toEqualTypeOf<
              NonNullable<Parameters<typeof db.user.deleteMany>[0]>
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
          input: zodSilk.input({
            where: UserDeleteManyInput,
          }),
        }),
      })

      const schema = weave(r)
      expect(printSchema(schema)).toMatchInlineSnapshot(`
        "type Mutation {
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
          async (next, { parseInput }) => {
            const input = await parseInput()
            expectTypeOf(input).toEqualTypeOf<
              NonNullable<Parameters<typeof db.user.update>[0]>
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
          input: zodSilk.input({
            data: UserUpdateInput,
            where: UserWhereInput,
          }),
        }),
      })

      const schema = weave(r)
      expect(printSchema(schema)).toMatchInlineSnapshot(`
        "type Mutation {
          updateUser(data: UserUpdateInput!, where: UserWhereInput!): User!
        }

        type User {
          id: ID!
          email: String!
          name: String
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
          async (next, { parseInput }) => {
            const input = await parseInput()
            expectTypeOf(input).toEqualTypeOf<
              NonNullable<Parameters<typeof db.user.updateMany>[0]>
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
          input: zodSilk.input({
            data: UserUpdateManyInput,
            where: UserWhereInput,
          }),
        }),
      })

      const schema = weave(r)
      expect(printSchema(schema)).toMatchInlineSnapshot(`
        "type Mutation {
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
          async (next, { parseInput }) => {
            const input = await parseInput()
            expectTypeOf(input).toEqualTypeOf<
              NonNullable<Parameters<typeof db.user.upsert>[0]>
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
          input: zodSilk.input({
            where: UserWhereUniqueInput,
            create: UserUpsertInput,
            update: UserUpsertInput,
          }),
        }),
      })

      const schema = weave(r)
      expect(printSchema(schema)).toMatchInlineSnapshot(`
        "type Mutation {
          upsertUser(where: UserWhereUniqueInput!, create: UserUpsertInput!, update: UserUpsertInput!): User!
        }

        type User {
          id: ID!
          email: String!
          name: String
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
