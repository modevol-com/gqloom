import { weave } from "@gqloom/core"
import { lexicographicSortSchema, printSchema, printType } from "graphql"
import { createYoga } from "graphql-yoga"
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest"
import { PrismaResolverFactory } from "../src"
import { type Prisma, PrismaClient } from "./client"
import * as p from "./generated"

describe("Bobbin Resolver", () => {
  const db = new PrismaClient()
  const userBobbin = new PrismaResolverFactory(p.User, db)
  const userResolver = userBobbin.resolver()

  it("should be able to create ResolverFactory", () => {
    expect(userResolver).toBeDefined()
  })

  it("should be able to create relationFields", () => {
    expect(userResolver["~meta"].fields.posts).toBeDefined()
    expect(userResolver["~meta"].fields.posts["~meta"].operation).toEqual(
      "field"
    )
    expect(userResolver["~meta"].fields.posts["~meta"].resolve).toBeTypeOf(
      "function"
    )

    expect(userResolver["~meta"].fields.profile).toBeDefined()
    expect(userResolver["~meta"].fields.profile["~meta"].operation).toEqual(
      "field"
    )
    expect(userResolver["~meta"].fields.profile["~meta"].resolve).toBeTypeOf(
      "function"
    )
  })

  it("should be able to create countQuery", async () => {
    expect(userResolver["~meta"].fields.countUser).toBeDefined()
    expect(userResolver["~meta"].fields.countUser["~meta"].operation).toEqual(
      "query"
    )
    expect(userResolver["~meta"].fields.countUser["~meta"].resolve).toBeTypeOf(
      "function"
    )
  })

  it("should be able to create findFirstQuery", async () => {
    expect(userResolver["~meta"].fields.findFirstUser).toBeDefined()
    expect(
      userResolver["~meta"].fields.findFirstUser["~meta"].operation
    ).toEqual("query")
    expect(
      userResolver["meta"].fields.findFirstUser["~meta"].resolve
    ).toBeTypeOf("function")
  })

  it("should be able to create findManyQuery", async () => {
    expect(userResolver["~meta"].fields.findManyUser).toBeDefined()
    expect(
      userResolver["~meta"].fields.findManyUser["~meta"].operation
    ).toEqual("query")
    expect(
      userResolver["~meta"].fields.findManyUser["~meta"].resolve
    ).toBeTypeOf("function")
  })

  it("should be able to create findUniqueQuery", async () => {
    expect(userResolver["~meta"].fields.findUniqueUser).toBeDefined()
    expect(
      userResolver["~meta"].fields.findUniqueUser["~meta"].operation
    ).toEqual("query")
    expect(
      userResolver["~meta"].fields.findUniqueUser["~meta"].resolve
    ).toBeTypeOf("function")
  })

  it("should be able to create updateQuery", async () => {
    expect(userResolver["~meta"].fields.updateUser).toBeDefined()
    expect(userResolver["~meta"].fields.updateUser["~meta"].operation).toEqual(
      "mutation"
    )
    expect(userResolver["~meta"].fields.updateUser["~meta"].resolve).toBeTypeOf(
      "function"
    )
  })

  it("should be able to create updateManyQuery", async () => {
    expect(userResolver["~meta"].fields.updateManyUser).toBeDefined()
    expect(
      userResolver["~meta"].fields.updateManyUser["~meta"].operation
    ).toEqual("mutation")
    expect(
      userResolver["~meta"].fields.updateManyUser["~meta"].resolve
    ).toBeTypeOf("function")
  })

  it("should be able to create deleteQuery", async () => {
    expect(userResolver["~meta"].fields.deleteUser).toBeDefined()
    expect(userResolver["~meta"].fields.deleteUser["~meta"].operation).toEqual(
      "mutation"
    )
    expect(userResolver["~meta"].fields.deleteUser["~meta"].resolve).toBeTypeOf(
      "function"
    )
  })

  it("should be able to create deleteManyQuery", async () => {
    expect(userResolver["~meta"].fields.deleteManyUser).toBeDefined()
    expect(
      userResolver["~meta"].fields.deleteManyUser["~meta"].operation
    ).toEqual("mutation")
    expect(
      userResolver["~meta"].fields.deleteManyUser["~meta"].resolve
    ).toBeTypeOf("function")
  })

  it("should be able to create upsertQuery", async () => {
    expect(userResolver["~meta"].fields.upsertUser).toBeDefined()
    expect(userResolver["~meta"].fields.upsertUser["~meta"].operation).toEqual(
      "mutation"
    )
    expect(userResolver["~meta"].fields.upsertUser["~meta"].resolve).toBeTypeOf(
      "function"
    )
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
    ).toMatchFileSnapshot("./resolver.spec.gql")
  })

  describe("mutations", () => {
    beforeAll(async () => {
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

    let logs: string[] = []
    const schema = weaveSchema((e) => {
      logs.push(e.query)
    })
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
      logs = []
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

      expect(["", ...logs, ""].join("\n")).toMatchInlineSnapshot(`
        "
        INSERT INTO \`main\`.\`User\` (\`email\`, \`name\`) VALUES (?,?) RETURNING \`id\` AS \`id\`, \`email\` AS \`email\`
        "
      `)
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

    it(
      "should be able to create a post with a author",
      { retry: 6 },
      async () => {
        const query = /* GraphQL */ `
        mutation createPost($data: PostCreateInput!) {
          createPost(data: $data) {
            id
            title
            author {
              id
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
              email: "bob@bob.com",
            },
          },
        })

        expect(["", ...logs, ""].join("\n")).toMatchInlineSnapshot(`
          "
          BEGIN IMMEDIATE
          SELECT \`main\`.\`User\`.\`id\` FROM \`main\`.\`User\` WHERE (\`main\`.\`User\`.\`email\` = ? AND 1=1) LIMIT ? OFFSET ?
          INSERT INTO \`main\`.\`User\` (\`email\`, \`name\`) VALUES (?,?) RETURNING \`id\` AS \`id\`
          INSERT INTO \`main\`.\`Post\` (\`title\`, \`published\`, \`authorId\`) VALUES (?,?,?) RETURNING \`id\` AS \`id\`
          SELECT \`main\`.\`Post\`.\`id\`, \`main\`.\`Post\`.\`title\`, \`main\`.\`Post\`.\`authorId\` FROM \`main\`.\`Post\` WHERE \`main\`.\`Post\`.\`id\` = ? LIMIT ? OFFSET ?
          SELECT \`main\`.\`User\`.\`id\`, \`main\`.\`User\`.\`email\`, \`main\`.\`User\`.\`name\` FROM \`main\`.\`User\` WHERE \`main\`.\`User\`.\`id\` IN (?) LIMIT ? OFFSET ?
          COMMIT
          SELECT \`main\`.\`Post\`.\`id\`, \`main\`.\`Post\`.\`authorId\` FROM \`main\`.\`Post\` WHERE (\`main\`.\`Post\`.\`id\` = ? AND 1=1) LIMIT ? OFFSET ?
          SELECT \`main\`.\`User\`.\`id\`, \`main\`.\`User\`.\`email\`, \`main\`.\`User\`.\`name\` FROM \`main\`.\`User\` WHERE \`main\`.\`User\`.\`id\` IN (?) LIMIT ? OFFSET ?
          "
        `)
      }
    )

    it("should be able to delete a user", { retry: 6 }, async () => {
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
      expect(["", ...logs, ""].join("\n")).toMatchInlineSnapshot(`
        "
        DELETE FROM \`main\`.\`User\` WHERE (\`main\`.\`User\`.\`email\` = ? AND 1=1) RETURNING \`id\` AS \`id\`, \`email\` AS \`email\`
        "
      `)
    })

    it("should be able to delete many posts", { retry: 6 }, async () => {
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
      expect(["", ...logs, ""].join("\n")).toMatchInlineSnapshot(`
        "
        UPDATE \`main\`.\`Post\` SET \`title\` = ? WHERE (\`main\`.\`Post\`.\`id\` = ? AND 1=1) RETURNING \`id\` AS \`id\`, \`title\` AS \`title\`
        "
      `)
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

      expect(["", ...logs, ""].join("\n")).toMatchInlineSnapshot(`
        "
        INSERT INTO \`main\`.\`User\` (\`email\`, \`name\`) VALUES (?,?) ON CONFLICT  (\`email\`) DO UPDATE SET \`name\` = ? WHERE (\`main\`.\`User\`.\`email\` = ? AND 1=1) RETURNING \`id\` AS \`id\`, \`email\` AS \`email\`, \`name\` AS \`name\`
        INSERT INTO \`main\`.\`User\` (\`email\`, \`name\`) VALUES (?,?) ON CONFLICT  (\`email\`) DO UPDATE SET \`name\` = ? WHERE (\`main\`.\`User\`.\`email\` = ? AND 1=1) RETURNING \`id\` AS \`id\`, \`email\` AS \`email\`, \`name\` AS \`name\`
        "
      `)
    })
  })

  describe("queries", () => {
    beforeAll(async () => {
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
    let logs: string[] = []
    const db = new PrismaClient({ log: [{ emit: "event", level: "query" }] })

    const schema = weaveSchema((query) => {
      logs.push(query.query)
    })
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

    afterEach(() => (logs = []))

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
            email
          }
        }
      `)

      expect(res.findManyUser).toHaveLength(4)

      expect(new Set(res.findManyUser)).toMatchObject(
        new Set([
          { email: "bob@bob.com" },
          { email: "alice@alice.com" },
          { email: "dave@qq.com" },
          { email: "charlie@qq.com" },
        ])
      )

      expect(["", ...logs, ""].join("\n")).toMatchInlineSnapshot(`
        "
        SELECT \`main\`.\`User\`.\`id\`, \`main\`.\`User\`.\`email\` FROM \`main\`.\`User\` WHERE 1=1 LIMIT ? OFFSET ?
        "
      `)
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

      expect(["", ...logs, ""].join("\n")).toMatchInlineSnapshot(`
        "
        SELECT \`main\`.\`User\`.\`id\`, \`main\`.\`User\`.\`name\` FROM \`main\`.\`User\` WHERE 1=1 ORDER BY \`main\`.\`User\`.\`name\` ASC LIMIT ? OFFSET ?
        "
      `)
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

      expect(["", ...logs, ""].join("\n")).toMatchInlineSnapshot(`
        "
        SELECT \`main\`.\`User\`.\`id\`, \`main\`.\`User\`.\`email\`, \`main\`.\`User\`.\`name\` FROM \`main\`.\`User\` WHERE \`main\`.\`User\`.\`email\` LIKE ? LIMIT ? OFFSET ?
        SELECT \`main\`.\`Post\`.\`id\`, \`main\`.\`Post\`.\`title\`, \`main\`.\`Post\`.\`content\`, \`main\`.\`Post\`.\`published\`, \`main\`.\`Post\`.\`authorId\`, \`main\`.\`Post\`.\`publishedById\` FROM \`main\`.\`Post\` WHERE \`main\`.\`Post\`.\`authorId\` IN (?) LIMIT ? OFFSET ?
        SELECT \`main\`.\`User\`.\`id\` FROM \`main\`.\`User\` WHERE (\`main\`.\`User\`.\`id\` = ? AND 1=1) LIMIT ? OFFSET ?
        SELECT \`main\`.\`Post\`.\`id\`, \`main\`.\`Post\`.\`title\`, \`main\`.\`Post\`.\`content\`, \`main\`.\`Post\`.\`published\`, \`main\`.\`Post\`.\`authorId\`, \`main\`.\`Post\`.\`publishedById\` FROM \`main\`.\`Post\` WHERE \`main\`.\`Post\`.\`authorId\` IN (?) LIMIT ? OFFSET ?
        "
      `)
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

      expect(["", ...logs, ""].join("\n")).toMatchInlineSnapshot(`
        "
        SELECT \`main\`.\`User\`.\`id\`, \`main\`.\`User\`.\`email\`, \`main\`.\`User\`.\`name\` FROM \`main\`.\`User\` WHERE (\`main\`.\`User\`.\`email\` = ? AND 1=1) LIMIT ? OFFSET ?
        SELECT \`main\`.\`Profile\`.\`id\`, \`main\`.\`Profile\`.\`userId\`, \`main\`.\`Profile\`.\`introduction\` FROM \`main\`.\`Profile\` WHERE \`main\`.\`Profile\`.\`userId\` IN (?) LIMIT ? OFFSET ?
        SELECT \`main\`.\`User\`.\`id\` FROM \`main\`.\`User\` WHERE (\`main\`.\`User\`.\`id\` = ? AND 1=1) LIMIT ? OFFSET ?
        SELECT \`main\`.\`Profile\`.\`id\`, \`main\`.\`Profile\`.\`userId\`, \`main\`.\`Profile\`.\`introduction\` FROM \`main\`.\`Profile\` WHERE \`main\`.\`Profile\`.\`userId\` IN (?) LIMIT ? OFFSET ?
        "
      `)
    })
  })
})

function weaveSchema(log?: (query: Prisma.QueryEvent) => void) {
  const db = new PrismaClient({ log: [{ emit: "event", level: "query" }] })
  db.$on("query", (e) => {
    log?.(e)
  })
  const userResolver = new PrismaResolverFactory(p.User, db).resolver()
  const postResolver = new PrismaResolverFactory(p.Post, db).resolver()
  const profileResolver = new PrismaResolverFactory(p.Profile, db).resolver()
  const catResolver = new PrismaResolverFactory(p.Cat, db).resolver()
  const dogResolver = new PrismaResolverFactory(p.Dog, db).resolver()
  const schema = weave(
    userResolver,
    postResolver,
    profileResolver,
    catResolver,
    dogResolver
  )
  return schema
}
