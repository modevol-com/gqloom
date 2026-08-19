import {
  getStandardValue,
  loom,
  type StandardSchemaV1,
  weave,
} from "@gqloom/core"
import { ZodWeaver } from "@gqloom/zod"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import {
  type GraphQLSchema,
  execute as graphqlExecute,
  parse,
  printSchema,
  printType,
} from "graphql"
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

function createExecute(schema: GraphQLSchema) {
  return async (
    query: string,
    variables?: Record<string, unknown>
  ): Promise<any> => {
    const { data, errors } = await graphqlExecute({
      schema,
      document: parse(query),
      variableValues: variables,
      contextValue: {},
    })
    if (errors?.length) throw new Error(JSON.stringify(errors))
    return data
  }
}

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
  const adapter = new PrismaBetterSqlite3({ url: ":memory:" })
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
    const userResolverFactory = new TestablePrismaModelResolverFactory(
      g.User,
      db
    )
    expect(userResolverFactory).toBeDefined()
  })

  it("should be able to create a uniqueWhere condition", () => {
    const userResolverFactory = new TestablePrismaModelResolverFactory(
      g.User,
      db
    )
    const userCondition = userResolverFactory.uniqueWhere({
      id: 4,
      name: "",
      email: "",
    })
    expect(userCondition).toEqual({ id: 4 })

    const sheepResolverFactory = new TestablePrismaModelResolverFactory(
      g.Sheep,
      db
    )
    const sheepCondition = sheepResolverFactory.uniqueWhere({
      firstCode: "foo",
      lastCode: "bar",
    })
    expect(sheepCondition).toEqual({
      firstCode_lastCode: { firstCode: "foo", lastCode: "bar" },
    })

    const dogResolverFactory = new TestablePrismaModelResolverFactory(g.Dog, db)
    const dogCondition = dogResolverFactory.uniqueWhere({
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
    const userResolverFactory = new PrismaResolverFactory(
      g.User,
      async () => db
    )
    const postResolverFactory = new PrismaResolverFactory(g.Post, db)
    const r1 = resolver.of(g.User, {
      users: query(g.User.list(), () => db.user.findMany()),

      posts: userResolverFactory.relationField("posts"),
    })

    const r2 = resolver.of(g.Post, {
      posts: query(g.Post.list(), () => db.post.findMany()),

      author: postResolverFactory.relationField("author"),
    })
    const schema = weave(r1, r2)
    const execute = createExecute(schema)
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
      const json = await execute(/* GraphQL */ `
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
            `)

      // if (!json?.data) return
      expect(json).toMatchObject({
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
      })
    })

    it("should handle many-to-many relations with empty relationFromFields/relationToFields", async () => {
      const adapter = new PrismaBetterSqlite3({ url: ":memory:" })
      const db = new PrismaClient({ adapter })
      for (const statement of CREATE_TABLES) {
        await db.$executeRawUnsafe(statement)
      }

      const user = await db.user.create({
        data: {
          name: "John Doe",
          email: "foo@bar.com",
        },
      })

      const posts = ["Hello World", "Hello GQLoom", "Post with category"].map(
        (title) => ({ title, content: "", authorId: user.id })
      )
      await db.post.createMany({
        data: [
          { ...posts[0], publisherId: null },
          { ...posts[1], publisherId: null },
          { ...posts[2], publisherId: user.id },
        ],
      })

      const postWithPublisherResolverFactory = new PrismaResolverFactory(
        g.Post,
        db
      )

      const r3 = resolver.of(g.Post, {
        posts: query(g.Post.list(), () => db.post.findMany()),
        publisher: postWithPublisherResolverFactory.relationField("publisher"),
      })

      const testSchema = weave(r3)
      const execute = createExecute(testSchema)

      const json = await execute(/* GraphQL */ `
            query {
              posts {
                title
                publisher {
                  id
                }
              }
            }
          `)

      expect(json.posts).toEqual([
        { title: posts[0].title, publisher: null },
        { title: posts[1].title, publisher: null },
        { title: posts[2].title, publisher: { id: String(user.id) } },
      ])
    })

    it("should be able to create a relationField", async () => {
      const postsField = userResolverFactory.relationField("posts")
      expect(postsField).toBeDefined()
      expect(postsField["~meta"].output).toBeTypeOf("object")
      expect(postsField["~meta"].operation).toEqual("field")
      expect(postsField["~meta"].resolve).toBeTypeOf("function")
      expectTypeOf(postsField["~meta"].resolve).returns.resolves.toEqualTypeOf<
        Partial<g.IPost>[]
      >()

      const userField = postResolverFactory.relationField("author")
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
    const userResolverFactory = new TestablePrismaModelResolverFactory(
      g.User,
      db
    )
    it("should be able to create a countQuery", () => {
      const q = userResolverFactory.countQuery({
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
        countUser: userResolverFactory.countQuery({
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
    const userResolverFactory = new TestablePrismaModelResolverFactory(
      g.User,
      db
    )
    it("should be able to create a findFirstQuery", () => {
      const q = userResolverFactory.findFirstQuery({
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
        findFirstUser: userResolverFactory.findFirstQuery({
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
    const userResolverFactory = new TestablePrismaModelResolverFactory(
      g.User,
      db
    )

    it("should be able to create a findManyQuery", () => {
      const q = userResolverFactory.findManyQuery({
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
        findManyUser: userResolverFactory.findManyQuery({
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
    const userResolverFactory = new TestablePrismaModelResolverFactory(
      g.User,
      db
    )

    it("should be able to create a findUniqueQuery", () => {
      const q = userResolverFactory.findUniqueQuery({
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
        findUniqueUser: userResolverFactory.findUniqueQuery({
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
    const userResolverFactory = new TestablePrismaModelResolverFactory(
      g.User,
      db
    )

    it("should be able to create a createMutation", () => {
      const m = userResolverFactory.createMutation({
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
        createUser: userResolverFactory.createMutation({
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

    it("should use with custom input with validation - validate name field with minLength and maxLength", async () => {
      const userResolver = resolver.of(g.User, {
        hello: query(z.string(), () => "world"),
        createUser: userResolverFactory.createMutation(),
      })
      const schema = weave(
        ZodWeaver,
        g.User.config({
          input: { name: z.string().min(3).max(20) },
        }),
        userResolver
      )
      const execute = createExecute(schema)
      const mutation = /* GraphQL */ `
        mutation CreateUser($data: UserCreateInput!) {
          createUser(data: $data) {
            id
            name
            email
          }
        }
      `
      await expect(
        execute(mutation, {
          data: { name: "J", email: "john@example.com" },
        })
      ).rejects.toThrow(/Too small: expected string to have >=3 characters/)

      const res = await execute(mutation, {
        data: { name: "Joe", email: "joe@example.com" },
      })
      expect(res.createUser).toBeDefined()
      expect(res.createUser.name).toBe("Joe")
      expect(res.createUser.email).toBe("joe@example.com")
    })

    it("should use with custom input with validation - validate email field with email format", async () => {
      const userResolver = resolver.of(g.User, {
        hello: query(z.string(), () => "world"),
        createUser: userResolverFactory.createMutation(),
      })
      const schema = weave(
        ZodWeaver,
        g.User.config({
          input: { email: z.email() },
        }),
        userResolver
      )
      const execute = createExecute(schema)
      const mutation = /* GraphQL */ `
        mutation CreateUser($data: UserCreateInput!) {
          createUser(data: $data) {
            id
            name
            email
          }
        }
      `
      const res = await execute(mutation, {
        data: {
          name: "John",
          email: "email-validation-only@example.com",
        },
      })
      expect(res.createUser).toBeDefined()
      expect(res.createUser.name).toBe("John")
      expect(res.createUser.email).toBe("email-validation-only@example.com")
    })

    it("should use with custom input with validation - validate multiple fields simultaneously", async () => {
      const userResolver = resolver.of(g.User, {
        hello: query(z.string(), () => "world"),
        createUser: userResolverFactory.createMutation(),
      })
      const schema = weave(
        ZodWeaver,
        g.User.config({
          input: {
            name: z.string().min(3).max(20),
            email: z.email(),
          },
        }),
        userResolver
      )
      const execute = createExecute(schema)
      const mutation = /* GraphQL */ `
        mutation CreateUser($data: UserCreateInput!) {
          createUser(data: $data) {
            id
            name
            email
          }
        }
      `
      await expect(
        execute(mutation, {
          data: { name: "Jo", email: "ab" },
        })
      ).rejects.toThrow(/Too small|Invalid email/)

      const res = await execute(mutation, {
        data: { name: "Joe", email: "joe-validation1@example.com" },
      })
      expect(res.createUser).toBeDefined()
      expect(res.createUser.name).toBe("Joe")
      expect(res.createUser.email).toBe("joe-validation1@example.com")
    })
  })

  describe("createManyMutation", async () => {
    const userResolverFactory = new TestablePrismaModelResolverFactory(
      g.User,
      db
    )

    beforeEach(async () => {
      await db.user.deleteMany()
    })

    it("should be able to create a createManyMutation", () => {
      const m = userResolverFactory.createManyMutation({
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
        createManyUser: userResolverFactory.createManyMutation({
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

    it("should use with custom input with validation - validate name field in array items", async () => {
      const userResolver = resolver.of(g.User, {
        hello: query(z.string(), () => "world"),
        createManyUser: userResolverFactory.createManyMutation(),
      })
      const schema = weave(
        ZodWeaver,
        g.User.config({
          input: { name: z.string().min(3).max(20) },
        }),
        userResolver
      )
      const execute = createExecute(schema)
      const mutation = /* GraphQL */ `
        mutation CreateManyUser($data: [UserCreateManyInput!]!) {
          createManyUser(data: $data) {
            count
          }
        }
      `
      await expect(
        execute(mutation, {
          data: [
            { name: "J", email: "john@example.com" },
            { name: "Joe", email: "joe@example.com" },
          ],
        })
      ).rejects.toThrow(/Too small: expected string to have >=3 characters/)

      const res = await execute(mutation, {
        data: [
          { name: "Joe", email: "joe@example.com" },
          { name: "Alice", email: "alice@example.com" },
        ],
      })
      expect(res.createManyUser).toBeDefined()
      expect(res.createManyUser.count).toBe(2)
    })

    it("should use with custom input with validation - validate email field in array items", async () => {
      const userResolver = resolver.of(g.User, {
        hello: query(z.string(), () => "world"),
        createManyUser: userResolverFactory.createManyMutation(),
      })
      const schema = weave(
        ZodWeaver,
        g.User.config({
          input: { email: z.email() },
        }),
        userResolver
      )
      const execute = createExecute(schema)
      const mutation = /* GraphQL */ `
        mutation CreateManyUser($data: [UserCreateManyInput!]!) {
          createManyUser(data: $data) {
            count
          }
        }
      `
      await expect(
        execute(mutation, {
          data: [
            { name: "John", email: "invalid-email" },
            { name: "Alice", email: "alice@example.com" },
          ],
        })
      ).rejects.toThrow(/Invalid email/)

      const res = await execute(mutation, {
        data: [
          { name: "John", email: "john@example.com" },
          { name: "Alice", email: "alice@example.com" },
        ],
      })
      expect(res.createManyUser).toBeDefined()
      expect(res.createManyUser.count).toBe(2)
    })
  })

  describe("deleteMutation", async () => {
    const userResolverFactory = new TestablePrismaModelResolverFactory(
      g.User,
      db
    )

    it("should be able to create a deleteMutation", () => {
      const m = userResolverFactory.deleteMutation({
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
        deleteUser: userResolverFactory.deleteMutation({
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
    const userResolverFactory = new TestablePrismaModelResolverFactory(
      g.User,
      db
    )

    it("should be able to create a deleteManyMutation", async () => {
      const m = userResolverFactory.deleteManyMutation({
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
        deleteManyUser: userResolverFactory.deleteManyMutation({
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
    const userResolverFactory = new TestablePrismaModelResolverFactory(
      g.User,
      db
    )
    let existingUser: { id: number; name: string | null; email: string }

    beforeEach(async () => {
      await db.user.deleteMany()
      const u = await db.user.create({
        data: { name: "John", email: "john@example.com" },
      })
      existingUser = u
    })

    it("should be able to create a deleteMutation", async () => {
      const m = userResolverFactory.updateMutation({
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
        updateUser: userResolverFactory.updateMutation({
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

    it("should use with custom input with validation - validate name field in update data", async () => {
      const userResolver = resolver.of(g.User, {
        hello: query(z.string(), () => "world"),
        updateUser: userResolverFactory.updateMutation(),
      })
      const schema = weave(
        ZodWeaver,
        g.User.config({
          input: { name: { update: z.string().min(3).max(20) } },
        }),
        userResolver
      )
      const execute = createExecute(schema)
      const mutation = /* GraphQL */ `
        mutation UpdateUser($data: UserUpdateInput!, $where: UserWhereUniqueInput!) {
          updateUser(data: $data, where: $where) {
            id
            name
            email
          }
        }
      `
      await expect(
        execute(mutation, {
          data: { name: "J" },
          where: { id: existingUser.id },
        })
      ).rejects.toThrow(/Too small: expected string to have >=3 characters/)

      const res = await execute(mutation, {
        data: { name: "Joe" },
        where: { id: existingUser.id },
      })
      expect(res.updateUser).toBeDefined()
      expect(res.updateUser.name).toBe("Joe")
      expect(res.updateUser.email).toBe(existingUser.email)
    })

    it("should use with custom input with validation - validate email field in update data", async () => {
      const userResolver = resolver.of(g.User, {
        hello: query(z.string(), () => "world"),
        updateUser: userResolverFactory.updateMutation(),
      })
      const schema = weave(
        ZodWeaver,
        g.User.config({
          input: { email: { update: z.email() } },
        }),
        userResolver
      )
      const execute = createExecute(schema)
      const mutation = /* GraphQL */ `
        mutation UpdateUser($data: UserUpdateInput!, $where: UserWhereUniqueInput!) {
          updateUser(data: $data, where: $where) {
            id
            name
            email
          }
        }
      `
      await expect(
        execute(mutation, {
          data: { email: "not-an-email" },
          where: { id: existingUser.id },
        })
      ).rejects.toThrow(/Invalid email/)

      const res = await execute(mutation, {
        data: { email: "valid@example.com" },
        where: { id: existingUser.id },
      })
      expect(res.updateUser).toBeDefined()
      expect(res.updateUser.email).toBe("valid@example.com")
    })

    it("should use with custom input with validation - only validate fields that are provided", async () => {
      const userResolver = resolver.of(g.User, {
        hello: query(z.string(), () => "world"),
        updateUser: userResolverFactory.updateMutation(),
      })
      const schema = weave(
        ZodWeaver,
        g.User.config({
          input: {
            name: { update: z.string().min(3).max(20) },
            email: { update: z.email() },
          },
        }),
        userResolver
      )
      const execute = createExecute(schema)
      const mutation = /* GraphQL */ `
        mutation UpdateUser($data: UserUpdateInput!, $where: UserWhereUniqueInput!) {
          updateUser(data: $data, where: $where) {
            id
            name
            email
          }
        }
      `
      // Only name provided - should validate name only (short name fails)
      await expect(
        execute(mutation, {
          data: { name: "Jo" },
          where: { id: existingUser.id },
        })
      ).rejects.toThrow(/Too small: expected string to have >=3 characters/)

      // Only name provided and valid - should pass (email not validated)
      const resName = await execute(mutation, {
        data: { name: "Joe" },
        where: { id: existingUser.id },
      })
      expect(resName.updateUser.name).toBe("Joe")

      // Only email provided and valid - should pass (name not validated)
      const resEmail = await execute(mutation, {
        data: { email: "other@example.com" },
        where: { id: existingUser.id },
      })
      expect(resEmail.updateUser.email).toBe("other@example.com")
    })

    it("should use with custom input with validation - validate multiple fields simultaneously", async () => {
      const userResolver = resolver.of(g.User, {
        hello: query(z.string(), () => "world"),
        updateUser: userResolverFactory.updateMutation(),
      })
      const schema = weave(
        ZodWeaver,
        g.User.config({
          input: {
            name: { update: z.string().min(3).max(20) },
            email: { update: z.email() },
          },
        }),
        userResolver
      )
      const execute = createExecute(schema)
      const mutation = /* GraphQL */ `
        mutation UpdateUser($data: UserUpdateInput!, $where: UserWhereUniqueInput!) {
          updateUser(data: $data, where: $where) {
            id
            name
            email
          }
        }
      `
      await expect(
        execute(mutation, {
          data: { name: "Jo", email: "ab" },
          where: { id: existingUser.id },
        })
      ).rejects.toThrow(/Too small|Invalid email/)

      const res = await execute(mutation, {
        data: { name: "Joe", email: "joe@example.com" },
        where: { id: existingUser.id },
      })
      expect(res.updateUser).toBeDefined()
      expect(res.updateUser.name).toBe("Joe")
      expect(res.updateUser.email).toBe("joe@example.com")
    })
  })

  describe("updateManyMutation", async () => {
    const userResolverFactory = new TestablePrismaModelResolverFactory(
      g.User,
      db
    )

    beforeEach(async () => {
      await db.user.deleteMany()
      await db.user.createMany({
        data: [
          { name: "John", email: "john@example.com" },
          { name: "Alice", email: "alice@example.com" },
        ],
      })
    })

    it("should be able to create a deleteMutation", async () => {
      const m = userResolverFactory.updateManyMutation({
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
        updateManyUser: userResolverFactory.updateManyMutation({
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

    it("should use with custom input with validation - validate name field in update data", async () => {
      const userResolver = resolver.of(g.User, {
        hello: query(z.string(), () => "world"),
        updateManyUser: userResolverFactory.updateManyMutation(),
      })
      const schema = weave(
        ZodWeaver,
        g.User.config({
          input: { name: { update: z.string().min(3).max(20) } },
        }),
        userResolver
      )
      const execute = createExecute(schema)
      const mutation = /* GraphQL */ `
        mutation UpdateManyUser($data: UserUpdateManyMutationInput!, $where: UserWhereInput!) {
          updateManyUser(data: $data, where: $where) {
            count
          }
        }
      `
      await expect(
        execute(mutation, {
          data: { name: "J" },
          where: { email: { contains: "@example.com" } },
        })
      ).rejects.toThrow(/Too small: expected string to have >=3 characters/)

      const res = await execute(mutation, {
        data: { name: "Joe" },
        where: { email: { contains: "@example.com" } },
      })
      expect(res.updateManyUser).toBeDefined()
      expect(res.updateManyUser.count).toBe(2)
    })

    it("should use with custom input with validation - validate email field in update data", async () => {
      const userResolver = resolver.of(g.User, {
        hello: query(z.string(), () => "world"),
        updateManyUser: userResolverFactory.updateManyMutation(),
      })
      const schema = weave(
        ZodWeaver,
        g.User.config({
          input: { email: { update: z.email() } },
        }),
        userResolver
      )
      const execute = createExecute(schema)
      const mutation = /* GraphQL */ `
        mutation UpdateManyUser($data: UserUpdateManyMutationInput!, $where: UserWhereInput!) {
          updateManyUser(data: $data, where: $where) {
            count
          }
        }
      `
      await expect(
        execute(mutation, {
          data: { email: "not-an-email" },
          where: { email: { equals: "john@example.com" } },
        })
      ).rejects.toThrow(/Invalid email/)

      const res = await execute(mutation, {
        data: { email: "updated@example.com" },
        where: { email: { equals: "john@example.com" } },
      })
      expect(res.updateManyUser).toBeDefined()
      expect(res.updateManyUser.count).toBe(1)
    })
  })

  describe("upsertMutation", async () => {
    const userResolverFactory = new TestablePrismaModelResolverFactory(
      g.User,
      db
    )

    beforeEach(async () => {
      await db.user.deleteMany()
    })

    it("should be able to create a deleteMutation", async () => {
      const m = userResolverFactory.upsertMutation({
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
        upsertUser: userResolverFactory.upsertMutation({
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

    it("should use with custom input with validation - validate name field in create data", async () => {
      const userResolver = resolver.of(g.User, {
        hello: query(z.string(), () => "world"),
        upsertUser: userResolverFactory.upsertMutation(),
      })
      const schema = weave(
        ZodWeaver,
        g.User.config({
          input: { name: { create: z.string().min(3).max(20) } },
        }),
        userResolver
      )
      const execute = createExecute(schema)
      const mutation = /* GraphQL */ `
        mutation UpsertUser($where: UserWhereUniqueInput!, $create: UserCreateInput!, $update: UserUpdateInput!) {
          upsertUser(where: $where, create: $create, update: $update) {
            id
            name
            email
          }
        }
      `
      await expect(
        execute(mutation, {
          where: { email: "new@example.com" },
          create: { name: "J", email: "new@example.com" },
          update: {},
        })
      ).rejects.toThrow(/Too small: expected string to have >=3 characters/)

      const res = await execute(mutation, {
        where: { email: "new@example.com" },
        create: { name: "Joe", email: "new@example.com" },
        update: {},
      })
      expect(res.upsertUser).toBeDefined()
      expect(res.upsertUser.name).toBe("Joe")
      expect(res.upsertUser.email).toBe("new@example.com")
    })

    it("should use with custom input with validation - validate name field in update data", async () => {
      await db.user.create({
        data: { name: "John", email: "john@example.com" },
      })

      const userResolver = resolver.of(g.User, {
        hello: query(z.string(), () => "world"),
        upsertUser: userResolverFactory.upsertMutation(),
      })
      const schema = weave(
        ZodWeaver,
        g.User.config({
          input: { name: { update: z.string().min(3).max(20) } },
        }),
        userResolver
      )
      const execute = createExecute(schema)
      const mutation = /* GraphQL */ `
        mutation UpsertUser($where: UserWhereUniqueInput!, $create: UserCreateInput!, $update: UserUpdateInput!) {
          upsertUser(where: $where, create: $create, update: $update) {
            id
            name
            email
          }
        }
      `
      await expect(
        execute(mutation, {
          where: { email: "john@example.com" },
          create: { name: "New", email: "new@example.com" },
          update: { name: "J" },
        })
      ).rejects.toThrow(/Too small: expected string to have >=3 characters/)

      const res = await execute(mutation, {
        where: { email: "john@example.com" },
        create: { name: "New", email: "new@example.com" },
        update: { name: "Joe" },
      })
      expect(res.upsertUser).toBeDefined()
      expect(res.upsertUser.name).toBe("Joe")
      expect(res.upsertUser.email).toBe("john@example.com")
    })

    it("should use with custom input with validation - validate both create and update data", async () => {
      const userResolver = resolver.of(g.User, {
        hello: query(z.string(), () => "world"),
        upsertUser: userResolverFactory.upsertMutation(),
      })
      const schema = weave(
        ZodWeaver,
        g.User.config({
          input: {
            name: {
              create: z.string().min(3).max(20),
              update: z.string().min(3).max(20),
            },
            email: {
              create: z.email(),
              update: z.email(),
            },
          },
        }),
        userResolver
      )
      const execute = createExecute(schema)
      const mutation = /* GraphQL */ `
        mutation UpsertUser($where: UserWhereUniqueInput!, $create: UserCreateInput!, $update: UserUpdateInput!) {
          upsertUser(where: $where, create: $create, update: $update) {
            id
            name
            email
          }
        }
      `
      // Both create and update have invalid data
      await expect(
        execute(mutation, {
          where: { email: "test@example.com" },
          create: { name: "Jo", email: "invalid-email" },
          update: { name: "Al", email: "also-invalid" },
        })
      ).rejects.toThrow(/Too small|Invalid email/)

      // Valid data
      const res = await execute(mutation, {
        where: { email: "test@example.com" },
        create: { name: "Joe", email: "test@example.com" },
        update: { name: "Alice", email: "updated@example.com" },
      })
      expect(res.upsertUser).toBeDefined()
      expect(res.upsertUser.name).toBe("Joe")
      expect(res.upsertUser.email).toBe("test@example.com")
    })

    it("should use with custom input with validation - only validate provided fields in update", async () => {
      await db.user.create({
        data: { name: "John", email: "john@example.com" },
      })

      const userResolver = resolver.of(g.User, {
        hello: query(z.string(), () => "world"),
        upsertUser: userResolverFactory.upsertMutation(),
      })
      const schema = weave(
        ZodWeaver,
        g.User.config({
          input: {
            name: { update: z.string().min(3).max(20) },
            email: { update: z.email() },
          },
        }),
        userResolver
      )
      const execute = createExecute(schema)
      const mutation = /* GraphQL */ `
        mutation UpsertUser($where: UserWhereUniqueInput!, $create: UserCreateInput!, $update: UserUpdateInput!) {
          upsertUser(where: $where, create: $create, update: $update) {
            id
            name
            email
          }
        }
      `
      // Only name provided in update - should validate name only (short name fails)
      await expect(
        execute(mutation, {
          where: { email: "john@example.com" },
          create: { name: "New", email: "new@example.com" },
          update: { name: "Jo" },
        })
      ).rejects.toThrow(/Too small: expected string to have >=3 characters/)

      // Only name provided and valid - should pass (email not validated)
      const resName = await execute(mutation, {
        where: { email: "john@example.com" },
        create: { name: "New", email: "new@example.com" },
        update: { name: "Joe" },
      })
      expect(resName.upsertUser.name).toBe("Joe")
      expect(resName.upsertUser.email).toBe("john@example.com")

      // Only email provided and valid - should pass (name not validated)
      const resEmail = await execute(mutation, {
        where: { email: "john@example.com" },
        create: { name: "New", email: "new@example.com" },
        update: { email: "updated@example.com" },
      })
      expect(resEmail.upsertUser.email).toBe("updated@example.com")
    })
  })

  describe("queriesResolver", () => {
    const userResolverFactory = new TestablePrismaModelResolverFactory(
      g.User,
      db
    )

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
      const resolver = userResolverFactory.queriesResolver()
      expect(resolver).toBeDefined()
    })

    it("should resolve queries correctly", async () => {
      const resolver = userResolverFactory.queriesResolver()
      const schema = weave(resolver)
      const execute = createExecute(schema)

      const json = await execute(/* GraphQL */ `
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
          `)

      expect(new Set(Object.keys(json))).toEqual(
        new Set(["countUser", "findFirstUser", "findManyUser"])
      )
    })

    it("should be created with middlewares", async () => {
      let count = 0
      const resolver = userResolverFactory.queriesResolver({
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
      const execute = createExecute(schema)

      await execute(/* GraphQL */ `
            query {
              countUser
            }
          `)

      expect(count).toBe(1)
    })
  })
})
