import {
  getStandardValue,
  loom,
  type StandardSchemaV1,
  weave,
} from "@gqloom/core"
import { ZodWeaver } from "@gqloom/zod"
import { PrismaBetterSQLite3 } from "@prisma/adapter-better-sqlite3"
import { printSchema, printType } from "graphql"
import { createYoga } from "graphql-yoga"
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  expectTypeOf,
  it,
} from "vitest"
import * as z from "zod"
import CREATE_TABLES from "../prisma/CREATE_TABLES.json"
import {
  type PrismaModelSilk,
  PrismaResolverFactory,
  type SelectiveModel,
} from "../src"
import { PrismaClient } from "./client/client"
import * as g from "./generated"

const { resolver, query } = loom

class TestablePrismaModelResolverFactory<
  TModelSilk extends PrismaModelSilk<any, string, Record<string, any>>,
  TClient extends PrismaClient,
> extends PrismaResolverFactory<TModelSilk, TClient> {
  public uniqueWhere(
    instance: Omit<
      StandardSchemaV1.InferOutput<NonNullable<TModelSilk>>,
      `__selective_${typeof this.silk.name}_brand__`
    >
  ): any {
    return super.uniqueWhere(instance)
  }

  public name?: TModelSilk["name"]
}

describe("PrismaModelPrismaResolverFactory", () => {
  const adapter = new PrismaBetterSQLite3({ url: ":memory:" })
  const db = new PrismaClient({ adapter })

  beforeAll(async () => {
    // Initialize database tables
    for (const statement of CREATE_TABLES) {
      await db.$executeRawUnsafe(statement)
    }

    let times = 0
    while (true) {
      try {
        await db.keyValue.create({
          data: { id: "testing-lock", value: "test" },
        })
        break
      } catch (err) {
        await new Promise((resolve) => setTimeout(resolve, 100))
        times++
        if (times > 66) {
          throw err
        }
      }
    }
  })

  afterAll(async () => {
    await db.keyValue.delete({
      where: { id: "testing-lock" },
    })
  })

  it("should be able to create a bobbin", () => {
    const UserBobbin = new TestablePrismaModelResolverFactory(g.User, db)
    expect(UserBobbin).toBeDefined()
  })

  it("should be able to create a uniqueWhere condition", () => {
    const UserBobbin = new TestablePrismaModelResolverFactory(g.User, db)
    const userCondition = UserBobbin.uniqueWhere({
      id: 4,
      name: "",
      email: "",
    })
    expect(userCondition).toEqual({ id: 4 })

    const SheepBobbin = new TestablePrismaModelResolverFactory(g.Sheep, db)
    const sheepCondition = SheepBobbin.uniqueWhere({
      firstCode: "foo",
      lastCode: "bar",
    })
    expect(sheepCondition).toEqual({
      firstCode_lastCode: { firstCode: "foo", lastCode: "bar" },
    })

    const DogBobbin = new TestablePrismaModelResolverFactory(g.Dog, db)
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
    const UserBobbin = new PrismaResolverFactory(g.User, async () => db)
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

    it("should handle many-to-many relations with empty relationFromFields/relationToFields", { retry: 6 }, async () => {
      const PostWithCategoriesBobbin = new PrismaResolverFactory(g.Post, db)
      const CategoryBobbin = new PrismaResolverFactory(g.Category, db)

      const r3 = resolver.of(g.Post, {
        posts: query(g.Post.list(), () => db.post.findMany()),
        categories: PostWithCategoriesBobbin.relationField("categories"),
      })

      const r4 = resolver.of(g.Category, {
        categories: query(g.Category.list(), () => db.category.findMany()),
        posts: CategoryBobbin.relationField("posts"),
      })

      const testSchema = weave(r3, r4)
      const testYoga = createYoga({ schema: testSchema })

      const response = await testYoga.fetch("http://localhost/graphql", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          query: /* GraphQL */ `
            query {
              posts {
                title
                categories {
                  id
                }
              }
            }
          `,
        }),
      })

      if (response.status !== 200) throw new Error("unexpected")
      const json = await response.json()
      expect(json.data.posts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            title: expect.any(String),
            categories: [],
          }),
        ])
      )
    })

    it("should be able to create a relationField", async () => {
      const postsField = UserBobbin.relationField("posts")
      expect(postsField).toBeDefined()
      expect(postsField["~meta"].output).toBeTypeOf("object")
      expect(postsField["~meta"].operation).toEqual("field")
      expect(postsField["~meta"].resolve).toBeTypeOf("function")
      expectTypeOf(postsField["~meta"].resolve).returns.resolves.toEqualTypeOf<
        Partial<g.IPost>[]
      >()

      const userField = PostBobbin.relationField("author")
      expect(userField).toBeDefined()
      expect(userField["~meta"].output).toBeTypeOf("object")
      expect(userField["~meta"].operation).toEqual("field")
      expect(userField["~meta"].resolve).toBeTypeOf("function")
      expectTypeOf(userField["~meta"].resolve).returns.resolves.toEqualTypeOf<
        Partial<g.IUser>
      >()
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
    const UserBobbin = new TestablePrismaModelResolverFactory(g.User, db)
    it("should be able to create a countQuery", () => {
      const q = UserBobbin.countQuery({
        middlewares: [
          async ({ next, parseInput }) => {
            const input = await parseInput.getResult()

            expectTypeOf(input).toEqualTypeOf<
              Parameters<typeof db.user.count>[0]
            >()
            expectTypeOf(next).returns.resolves.toEqualTypeOf<number>()
            return next()
          },
        ],
      })

      expect(q).toBeDefined()
      expect(q["~meta"].output).toBeTypeOf("object")
      expect(q["~meta"].operation).toEqual("query")
      expect(q["~meta"].resolve).toBeTypeOf("function")
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
    const UserBobbin = new TestablePrismaModelResolverFactory(g.User, db)
    it("should be able to create a findFirstQuery", () => {
      const q = UserBobbin.findFirstQuery({
        middlewares: [
          async ({ next, parseInput }) => {
            const input = getStandardValue(await parseInput())
            expectTypeOf(input).toEqualTypeOf<
              Parameters<typeof db.user.findFirst>[0]
            >()
            expectTypeOf(next).returns.resolves.toEqualTypeOf<SelectiveModel<
              g.IUser,
              "user"
            > | null>()
            return next()
          },
        ],
      })

      expect(q).toBeDefined()
      expect(q["~meta"].output).toBeTypeOf("object")
      expect(q["~meta"].operation).toEqual("query")
      expect(q["~meta"].resolve).toBeTypeOf("function")
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
    const UserBobbin = new TestablePrismaModelResolverFactory(g.User, db)

    it("should be able to create a findManyQuery", () => {
      const q = UserBobbin.findManyQuery({
        middlewares: [
          async ({ next, parseInput }) => {
            const input = getStandardValue(await parseInput())
            expectTypeOf(input).toEqualTypeOf<
              Parameters<typeof db.user.findMany>[0]
            >()
            expectTypeOf(next).returns.resolves.toEqualTypeOf<
              SelectiveModel<g.IUser, "user">[]
            >()
            return next()
          },
        ],
      })

      expect(q).toBeDefined()
      expect(q["~meta"].output).toBeTypeOf("object")
      expect(q["~meta"].operation).toEqual("query")
      expect(q["~meta"].resolve).toBeTypeOf("function")
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
    const UserBobbin = new TestablePrismaModelResolverFactory(g.User, db)

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
            expectTypeOf(next).returns.resolves.toEqualTypeOf<SelectiveModel<
              g.IUser,
              "user"
            > | null>()
            return next()
          },
        ],
      })

      expect(q).toBeDefined()
      expect(q["~meta"].output).toBeTypeOf("object")
      expect(q["~meta"].operation).toEqual("query")
      expect(q["~meta"].resolve).toBeTypeOf("function")
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
    const UserBobbin = new TestablePrismaModelResolverFactory(g.User, db)

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
            expectTypeOf(next).returns.resolves.toEqualTypeOf<
              SelectiveModel<g.IUser, "user">
            >()
            return next()
          },
        ],
      })

      expect(m).toBeDefined()
      expect(m["~meta"].output).toBeTypeOf("object")
      expect(m["~meta"].operation).toEqual("mutation")
      expect(m["~meta"].resolve).toBeTypeOf("function")
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
    const UserBobbin = new TestablePrismaModelResolverFactory(g.User, db)

    it("should be able to create a createManyMutation", () => {
      const m = UserBobbin.createManyMutation({
        middlewares: [
          async ({ next, parseInput }) => {
            const input = getStandardValue(await parseInput())
            expectTypeOf(input).toEqualTypeOf<
              Parameters<typeof db.user.createMany>[0]
            >()
            return next()
          },
        ],
      })

      expect(m).toBeDefined()
      expect(m["~meta"].output).toBeTypeOf("object")
      expect(m["~meta"].operation).toEqual("mutation")
      expect(m["~meta"].resolve).toBeTypeOf("function")
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
    const UserBobbin = new TestablePrismaModelResolverFactory(g.User, db)

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
      expect(m["~meta"].output).toBeTypeOf("object")
      expect(m["~meta"].operation).toEqual("mutation")
      expect(m["~meta"].resolve).toBeTypeOf("function")
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
    const UserBobbin = new TestablePrismaModelResolverFactory(g.User, db)

    it("should be able to create a deleteManyMutation", async () => {
      const m = UserBobbin.deleteManyMutation({
        middlewares: [
          async ({ next, parseInput }) => {
            const input = getStandardValue(await parseInput())
            expectTypeOf(input).toEqualTypeOf<
              Parameters<typeof db.user.deleteMany>[0]
            >()
            return next()
          },
        ],
      })

      expect(m).toBeDefined()
      expect(m["~meta"].output).toBeTypeOf("object")
      expect(m["~meta"].operation).toEqual("mutation")
      expect(m["~meta"].resolve).toBeTypeOf("function")
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
    const UserBobbin = new TestablePrismaModelResolverFactory(g.User, db)

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
      expect(m["~meta"].output).toBeTypeOf("object")
      expect(m["~meta"].operation).toEqual("mutation")
      expect(m["~meta"].resolve).toBeTypeOf("function")
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
    const UserBobbin = new TestablePrismaModelResolverFactory(g.User, db)

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
      expect(m["~meta"].output).toBeTypeOf("object")
      expect(m["~meta"].operation).toEqual("mutation")
      expect(m["~meta"].resolve).toBeTypeOf("function")
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
    const UserBobbin = new TestablePrismaModelResolverFactory(g.User, db)

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
      expect(m["~meta"].output).toBeTypeOf("object")
      expect(m["~meta"].operation).toEqual("mutation")
      expect(m["~meta"].resolve).toBeTypeOf("function")
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

  describe("queriesResolver", () => {
    const UserBobbin = new TestablePrismaModelResolverFactory(g.User, db)

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

    it("should be created without error", () => {
      const resolver = UserBobbin.queriesResolver()
      expect(resolver).toBeDefined()
    })

    it("should resolve queries correctly", async () => {
      const resolver = UserBobbin.queriesResolver()
      const schema = weave(resolver)
      const yoga = createYoga({ schema })

      const response = await yoga.fetch("http://localhost/graphql", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          query: /* GraphQL */ `
            query {
              countUser
              findFirstUser {
                name
                email
              }
              findManyUser {
                name
                email
                posts {
                  title
                }
              }
            }
          `,
        }),
      })

      if (response.status !== 200) throw new Error("unexpected")
      const json = await response.json()
      expect(new Set(Object.keys(json.data))).toEqual(
        new Set(["countUser", "findFirstUser", "findManyUser"])
      )
    })

    it("should be created with middlewares", async () => {
      let count = 0
      const resolver = UserBobbin.queriesResolver({
        middlewares: [
          async ({ parseInput, next }) => {
            const input = await parseInput()
            if (input.issues) throw new Error("Invalid input")
            count++
            const answer = await next()
            return answer
          },
        ],
      })
      const schema = weave(resolver)
      const yoga = createYoga({ schema })

      await yoga.fetch("http://localhost/graphql", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          query: /* GraphQL */ `
            query {
              countUser
            }
          `,
        }),
      })

      expect(count).toBe(1)
    })
  })
})
