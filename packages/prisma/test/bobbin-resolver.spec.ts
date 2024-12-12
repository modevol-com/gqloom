import { weave } from "@gqloom/core"
import { lexicographicSortSchema, printSchema, printType } from "graphql"
import { createYoga } from "graphql-yoga"
import { beforeAll, beforeEach, describe, expect, it } from "vitest"
import { PrismaModelBobbin } from "../src"
import { PrismaClient } from "./client"
import * as p from "./generated"

describe("Bobbin Resolver", () => {
  const db = new PrismaClient()
  const userBobbin = new PrismaModelBobbin(p.User, db)
  const userResolver = userBobbin.resolver()

  it("should be able to create Bobbin", () => {
    expect(userResolver).toBeDefined()
  })

  it("should be able to create relationFields", () => {
    expect(userResolver.posts).toBeDefined()
    expect(userResolver.posts.type).toEqual("field")
    expect(userResolver.posts.resolve).toBeTypeOf("function")

    expect(userResolver.profile).toBeDefined()
    expect(userResolver.profile.type).toEqual("field")
    expect(userResolver.profile.resolve).toBeTypeOf("function")
  })

  it("should be able to create countQuery", async () => {
    expect(userResolver.countUser).toBeDefined()
    expect(userResolver.countUser.type).toEqual("query")
    expect(userResolver.countUser.resolve).toBeTypeOf("function")
  })

  it("should be able to create findFirstQuery", async () => {
    expect(userResolver.findFirstUser).toBeDefined()
    expect(userResolver.findFirstUser.type).toEqual("query")
    expect(userResolver.findFirstUser.resolve).toBeTypeOf("function")
  })

  it("should be able to create findManyQuery", async () => {
    expect(userResolver.findManyUser).toBeDefined()
    expect(userResolver.findManyUser.type).toEqual("query")
    expect(userResolver.findManyUser.resolve).toBeTypeOf("function")
  })

  it("should be able to create findUniqueQuery", async () => {
    expect(userResolver.findUniqueUser).toBeDefined()
    expect(userResolver.findUniqueUser.type).toEqual("query")
    expect(userResolver.findUniqueUser.resolve).toBeTypeOf("function")
  })

  it("should be able to create updateQuery", async () => {
    expect(userResolver.updateUser).toBeDefined()
    expect(userResolver.updateUser.type).toEqual("mutation")
    expect(userResolver.updateUser.resolve).toBeTypeOf("function")
  })

  it("should be able to create updateManyQuery", async () => {
    expect(userResolver.updateManyUser).toBeDefined()
    expect(userResolver.updateManyUser.type).toEqual("mutation")
    expect(userResolver.updateManyUser.resolve).toBeTypeOf("function")
  })

  it("should be able to create deleteQuery", async () => {
    expect(userResolver.deleteUser).toBeDefined()
    expect(userResolver.deleteUser.type).toEqual("mutation")
    expect(userResolver.deleteUser.resolve).toBeTypeOf("function")
  })

  it("should be able to create deleteManyQuery", async () => {
    expect(userResolver.deleteManyUser).toBeDefined()
    expect(userResolver.deleteManyUser.type).toEqual("mutation")
    expect(userResolver.deleteManyUser.resolve).toBeTypeOf("function")
  })

  it("should be able to create upsertQuery", async () => {
    expect(userResolver.upsertUser).toBeDefined()
    expect(userResolver.upsertUser.type).toEqual("mutation")
    expect(userResolver.upsertUser.resolve).toBeTypeOf("function")
  })

  it("should be able to weave schema", async () => {
    const schema = weaveSchema()

    expect(printType(schema.getType("User")!)).toMatchInlineSnapshot(`
      "type User {
        id: ID!
        email: String!
        name: String
        posts: [Post!]!
        publishedPosts: [Post!]!
        profile: Profile
      }"
    `)

    await expect(
      printSchema(lexicographicSortSchema(schema))
    ).toMatchFileSnapshot("./bobbin-resolver.spec.gql")
  })

  describe("mutations", () => {
    const schema = weaveSchema()
    const yoga = createYoga({ schema })
    const execute = async (query: string, variables?: Record<string, any>) => {
      const response = await yoga.fetch("http://localhost/graphql", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          query,
          variables,
        }),
      })

      const { data, errors } = await response.json()

      if (response.status !== 200) {
        throw new Error(JSON.stringify(errors))
      }
      return data
    }
    beforeEach(async () => {
      await db.post.deleteMany()
      await db.user.deleteMany()
    })

    it("should be able to create a user", async () => {
      const query = /* GraphQL */ `
        mutation createUser($data: UserCreateInput!) {
          createUser(data: $data) {
            id
            email
          }
        }
      `
      const response = await execute(query, {
        data: {
          email: "bob@bob.com",
          name: "Bob",
        },
      })

      expect(response).toMatchObject({
        createUser: {
          id: expect.any(String),
          email: "bob@bob.com",
        },
      })
    })

    it("should be able to create many users", async () => {
      const query = /* GraphQL */ `
        mutation createUsers($data: [UserCreateManyInput!]!) {
          createManyUser(data: $data) {
            count
          }
        }
      `
      const response = await execute(query, {
        data: [
          { email: "bob@bob.com", name: "Bob" },
          { email: "alice@alice.com", name: "Alice" },
        ],
      })

      expect(response).toMatchObject({
        createManyUser: {
          count: 2,
        },
      })
    })

    it("should be able to create a post with a author", async () => {
      const query = /* GraphQL */ `
        mutation createPost($data: PostCreateInput!) {
          createPost(data: $data) {
            id
            title
            author {
              id
              name
              email
            }
          }
        }
      `

      const response = await execute(query, {
        data: {
          title: "Hello World",
          author: {
            connectOrCreate: {
              where: {
                email: "bob@bob.com",
              },
              create: {
                email: "bob@bob.com",
                name: "Bob",
              },
            },
          },
        },
      })

      expect(response).toMatchObject({
        createPost: {
          id: expect.any(String),
          title: "Hello World",
          author: {
            id: expect.any(String),
            name: "Bob",
            email: "bob@bob.com",
          },
        },
      })
    })

    it("should be able to delete a user", async () => {
      await db.user.create({ data: { email: "bob@bob.com" } })

      const query = /* GraphQL */ `
        mutation deleteUser($where: UserWhereUniqueInput!) {
          deleteUser(where: $where) {
            id
            email
          }
        }
      `
      const response = await execute(query, {
        where: {
          email: "bob@bob.com",
        },
      })

      expect(response).toMatchObject({
        deleteUser: {
          id: expect.any(String),
          email: "bob@bob.com",
        },
      })
    })

    it("should be able to delete many posts", async () => {
      const user = await db.user.create({ data: { email: "bob@bob.com" } })

      await db.post.createMany({
        data: [
          { title: "Hello", authorId: user.id },
          { title: "World", authorId: user.id },
        ],
      })

      const query = /* GraphQL */ `
        mutation deleteManyPost($where: PostWhereInput!) {
          deleteManyPost(where: $where) {
            count
          }
        }
      `

      const response = await execute(query, {
        where: { author: { is: { id: { equals: user.id } } } },
      })

      expect(response).toMatchObject({
        deleteManyPost: {
          count: 2,
        },
      })
    })

    it("should be able to update a post", { retry: 6 }, async () => {
      const user = await db.user.create({ data: { email: "bob@bob.com" } })
      const post = await db.post.create({
        data: { title: "Hello", authorId: user.id },
      })

      const query = /* GraphQL */ `
        mutation updatePost(
          $where: PostWhereUniqueInput!
          $data: PostUpdateInput!
        ) {
          updatePost(where: $where, data: $data) {
            id
            title
          }
        }
      `

      const response = await execute(query, {
        where: { id: post.id },
        data: { title: { set: "Hello World" } },
      })

      expect(response).toMatchObject({
        updatePost: {
          id: expect.any(String),
          title: "Hello World",
        },
      })
    })

    it("should be able to update many posts", async () => {
      const user = await db.user.create({ data: { email: "bob@bob.com" } })

      await db.post.createMany({
        data: [
          { title: "Hello", authorId: user.id },
          { title: "World", authorId: user.id },
        ],
      })

      const query = /* GraphQL */ `
        mutation updateManyPost(
          $where: PostWhereInput!
          $data: PostUpdateManyMutationInput!
        ) {
          updateManyPost(where: $where, data: $data) {
            count
          }
        }
      `

      const response = await execute(query, {
        where: { author: { is: { id: { equals: user.id } } } },
        data: { title: { set: "Hello World" } },
      })

      expect(response).toMatchObject({
        updateManyPost: {
          count: 2,
        },
      })
    })

    it("should be able to upsert a user", async () => {
      const query = /* GraphQL */ `
        mutation upsertUser(
          $where: UserWhereUniqueInput!
          $create: UserCreateInput!
          $update: UserUpdateInput!
        ) {
          upsertUser(where: $where, create: $create, update: $update) {
            id
            email
            name
          }
        }
      `

      const res1 = await execute(query, {
        where: { email: "bob@bob.com" },
        create: { email: "bob@bob.com", name: "Bob" },
        update: { name: { set: "Bob Smith" } },
      })

      expect(res1).toMatchObject({
        upsertUser: {
          id: expect.any(String),
          email: "bob@bob.com",
          name: "Bob",
        },
      })

      const res2 = await execute(query, {
        where: { email: "bob@bob.com" },
        create: { email: "bob@bob.com", name: "Bob" },
        update: { name: { set: "Bob Smith" } },
      })

      expect(res2).toMatchObject({
        upsertUser: {
          id: expect.any(String),
          email: "bob@bob.com",
          name: "Bob Smith",
        },
      })
    })
  })

  describe("queries", () => {
    const db = new PrismaClient()
    const schema = weaveSchema()
    const yoga = createYoga({ schema })
    const execute = async (query: string, variables?: Record<string, any>) => {
      const response = await yoga.fetch("http://localhost/graphql", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          query,
          variables,
        }),
      })

      const { data, errors } = await response.json()

      if (response.status !== 200) {
        throw new Error(JSON.stringify(errors))
      }
      return data
    }

    beforeAll(async () => {
      await db.post.deleteMany()
      await db.profile.deleteMany()
      await db.user.deleteMany()
      const Bob = await db.user.create({
        data: { email: "bob@bob.com", name: "Bob" },
      })
      const Alice = await db.user.create({
        data: { email: "alice@alice.com", name: "Alice" },
      })
      await db.user.createMany({
        data: [
          { email: "dave@qq.com", name: "Dave" },
          { email: "charlie@qq.com", name: "Charlie" },
        ],
      })

      await db.post.createMany({
        data: [
          { title: "Hello Bob", content: "Hello world", authorId: Bob.id },
          { title: "Goodbye", content: "Goodbye world", authorId: Bob.id },
        ],
      })

      await db.post.createMany({
        data: [
          { title: "Hello Alice", content: "Hello world", authorId: Alice.id },
        ],
      })

      await db.profile.create({
        data: { introduction: "I am Bob", userId: Bob.id },
      })
    })

    it("should query users", async () => {
      const res = await execute(/* GraphQL */ `
        query users {
          findManyUser {
            name
            email
          }
        }
      `)

      expect(res.findManyUser).toHaveLength(4)

      expect(new Set(res.findManyUser)).toMatchObject(
        new Set([
          { name: "Bob", email: "bob@bob.com" },
          { name: "Alice", email: "alice@alice.com" },
          { name: "Dave", email: "dave@qq.com" },
          { name: "Charlie", email: "charlie@qq.com" },
        ])
      )
    })

    it("should query users with pagination", async () => {
      const res = await execute(/* GraphQL */ `
        query users {
          findManyUser(skip: 1, take: 2, orderBy: [{ name: { sort: asc } }]) {
            name
          }
        }
      `)

      expect(res.findManyUser).toHaveLength(2)
      expect(res.findManyUser).toMatchObject([
        { name: "Bob" },
        { name: "Charlie" },
      ])
    })

    it("should query users with posts", async () => {
      const res = await execute(/* GraphQL */ `
        query users {
          findFirstUser(where: { email: { startsWith: "bob" } }) {
            name
            email
            posts {
              title
            }
          }
        }
      `)

      expect(new Set(res.findFirstUser.posts)).toEqual(
        new Set([{ title: "Hello Bob" }, { title: "Goodbye" }])
      )
    })

    it("should query users with profile", async () => {
      const res = await execute(/* GraphQL */ `
        query users {
          findUniqueUser(where: { email: "bob@bob.com" }) {
            name
            email
            profile {
              introduction
            }
          }
        }
      `)

      expect(res.findUniqueUser.profile).toMatchObject({
        introduction: "I am Bob",
      })
    })
  })
})

function weaveSchema() {
  const db = new PrismaClient()
  const userResolver = new PrismaModelBobbin(p.User, db).resolver()
  const postResolver = new PrismaModelBobbin(p.Post, db).resolver()
  const profileResolver = new PrismaModelBobbin(p.Profile, db).resolver()
  const catResolver = new PrismaModelBobbin(p.Cat, db).resolver()
  const dogResolver = new PrismaModelBobbin(p.Dog, db).resolver()
  const schema = weave(
    userResolver,
    postResolver,
    profileResolver,
    catResolver,
    dogResolver
  )
  return schema
}
