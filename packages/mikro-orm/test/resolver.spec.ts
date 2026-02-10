import { AsyncLocalStorage } from "node:async_hooks"
import { weave } from "@gqloom/core"
import { defineEntity, type InferEntity } from "@mikro-orm/core"
import { defineConfig, MikroORM } from "@mikro-orm/libsql"
import {
  execute as executeGraphQL,
  type GraphQLSchema,
  parse,
  printSchema,
} from "graphql"
import { beforeAll, describe, expect, expectTypeOf, it } from "vitest"
import { MikroResolverFactory, mikroSilk } from "../src"

const LogsStorage = new AsyncLocalStorage<string[]>()

describe("Mikro Resolver", () => {
  const [User, Post] = (() => {
    const User = defineEntity({
      name: "User",
      properties: (p) => ({
        id: p.integer().primary().autoincrement(),
        name: p.string(),
        email: p.string(),
        posts: () => p.oneToMany(Post).mappedBy("author"),
      }),
    })

    const Post = defineEntity({
      name: "Post",
      properties: (p) => ({
        id: p.integer().primary().autoincrement(),
        title: p.string(),
        content: p.string().lazy(),
        author: () => p.manyToOne(User).ref(),
      }),
    })

    return [mikroSilk(User), mikroSilk(Post)] as const
  })()

  type IPost = InferEntity<typeof Post>
  type IUser = InferEntity<typeof User>
  const config = defineConfig({
    entities: [User, Post],
    dbName: ":memory:",
    allowGlobalContext: true,
    debug: true,
    logger: (message) => {
      const logs = LogsStorage.getStore() ?? []
      logs.push(
        message
          .replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g"), "")
          .replace(/ \[took \d+ ms.*\]/g, "")
      )
    },
  })

  it("should create resolver factory correctly", async () => {
    const orm = await MikroORM.init(config)
    const userFactory = new MikroResolverFactory(User, () => orm.em)
    const postFactory = new MikroResolverFactory(Post, () => orm.em)
    expect(userFactory).toBeDefined()
    expect(postFactory).toBeDefined()
    expect(userFactory.queriesResolver()).toBeDefined()
    expect(userFactory.resolver()).toBeDefined()
    expect(postFactory.queriesResolver()).toBeDefined()
    expect(postFactory.resolver()).toBeDefined()
  })

  it("should weave GraphQL schema correctly", async () => {
    const orm = await MikroORM.init(config)
    const userResolver = new MikroResolverFactory(User, () => orm.em).resolver(
      "User"
    )
    const postResolver = new MikroResolverFactory(Post, () => orm.em).resolver(
      "Post"
    )
    const schema = weave(userResolver, postResolver)

    const userEx = userResolver.toExecutor()
    const postEx = postResolver.toExecutor()
    expectTypeOf(userEx.posts).returns.resolves.toEqualTypeOf<
      Partial<IPost>[]
    >()
    expectTypeOf(postEx.author).returns.resolves.toEqualTypeOf<Partial<IUser>>()
    await expect(printSchema(schema)).toMatchFileSnapshot(
      "./snapshots/full-resolver.gql"
    )
  })

  describe("query", () => {
    let orm: MikroORM
    let schema: GraphQLSchema

    const execute = async (query: string, variables?: Record<string, any>) => {
      const logs: string[] = []
      const response = await LogsStorage.run(logs, () =>
        executeGraphQL({
          schema,
          document: parse(query),
          variableValues: variables,
        })
      )
      if (response.errors) {
        throw response.errors[0]
      }
      return [response.data, logs] as const
    }

    beforeAll(async () => {
      orm = await MikroORM.init(config)
      const userResolver = new MikroResolverFactory(
        User,
        () => orm.em
      ).resolver("User")
      const postResolver = new MikroResolverFactory(
        Post,
        () => orm.em
      ).resolver("Post")
      schema = weave(userResolver, postResolver)
      await orm.schema.refresh()
      const user1 = orm.em.create(User, {
        id: 1,
        name: "User 1",
        email: "user1@test.com",
      })
      orm.em.create(User, { id: 2, name: "User 2", email: "user2@test.com" })
      orm.em.create(User, { id: 3, name: "User 3", email: "user3@test.com" })
      orm.em.create(Post, {
        id: 1,
        title: "Post 1",
        content: "Content 1",
        author: user1,
      })
      orm.em.create(Post, {
        id: 2,
        title: "Post 2",
        content: "Content 2",
        author: user1,
      })
      await orm.em.flush()
      orm.em.clear()
    })

    it("should find all entities", async () => {
      const [data, logs] = await execute(/* GraphQL */ `
        query {
          findUser {
            id
            name
            email
          }
        }
      `)
      expect(data).toMatchInlineSnapshot(`
        {
          "findUser": [
            {
              "email": "user1@test.com",
              "id": "1",
              "name": "User 1",
            },
            {
              "email": "user2@test.com",
              "id": "2",
              "name": "User 2",
            },
            {
              "email": "user3@test.com",
              "id": "3",
              "name": "User 3",
            },
          ],
        }
      `)
      expect(logs).toMatchInlineSnapshot(`
        [
          "[query] select \`u0\`.\`id\`, \`u0\`.\`name\`, \`u0\`.\`email\` from \`user\` as \`u0\`",
        ]
      `)
    })

    it("should find entities with where clause", async () => {
      const [data, logs] = await execute(/* GraphQL */ `
        query {
          findUser(where: { name: { eq: "User 1" } }) {
            id
            name
          }
        }
      `)
      expect(data).toMatchInlineSnapshot(`
        {
          "findUser": [
            {
              "id": "1",
              "name": "User 1",
            },
          ],
        }
      `)
      expect(logs).toMatchInlineSnapshot(`
        [
          "[query] select \`u0\`.\`id\`, \`u0\`.\`name\` from \`user\` as \`u0\` where \`u0\`.\`name\` = 'User 1'",
        ]
      `)
    })

    it("should find entities with order by", async () => {
      const [data, logs] = await execute(/* GraphQL */ `
        query {
          findUser(orderBy: { name: DESC }) {
            name
          }
        }
      `)
      expect(data).toMatchInlineSnapshot(`
        {
          "findUser": [
            {
              "name": "User 3",
            },
            {
              "name": "User 2",
            },
            {
              "name": "User 1",
            },
          ],
        }
      `)
      expect(logs).toMatchInlineSnapshot(`
        [
          "[query] select \`u0\`.\`id\`, \`u0\`.\`name\` from \`user\` as \`u0\` order by \`u0\`.\`name\` desc",
        ]
      `)
    })

    it("should find entities with limit and offset", async () => {
      const [data, logs] = await execute(/* GraphQL */ `
        query {
          findUser(orderBy: { id: ASC }, limit: 1, offset: 1) {
            id
          }
        }
      `)
      expect(data).toMatchInlineSnapshot(`
        {
          "findUser": [
            {
              "id": "2",
            },
          ],
        }
      `)
      expect(logs).toMatchInlineSnapshot(`
        [
          "[query] select \`u0\`.\`id\` from \`user\` as \`u0\` order by \`u0\`.\`id\` asc limit 1 offset 1",
        ]
      `)
    })

    it("should count entities", async () => {
      const [data, logs] = await execute(/* GraphQL */ `
        query {
          countUser(where: { id: { gt: 1 } })
        }
      `)
      expect(data).toMatchInlineSnapshot(`
        {
          "countUser": 2,
        }
      `)
      expect(logs).toMatchInlineSnapshot(`
        [
          "[query] select count(*) as \`count\` from \`user\` as \`u0\` where \`u0\`.\`id\` > '1'",
        ]
      `)
    })

    it("should find one entity", async () => {
      const [data, logs] = await execute(/* GraphQL */ `
        query {
          findOneUser(where: { name: { eq: "User 1" } }) {
            id
            name
          }
        }
      `)
      expect(data).toMatchInlineSnapshot(`
        {
          "findOneUser": {
            "id": "1",
            "name": "User 1",
          },
        }
      `)
      expect(logs).toMatchInlineSnapshot(`
        [
          "[query] select \`u0\`.\`id\`, \`u0\`.\`name\` from \`user\` as \`u0\` where \`u0\`.\`name\` = 'User 1' limit 1",
        ]
      `)
    })

    it("should find one entity or fail", async () => {
      const [data, logs] = await execute(/* GraphQL */ `
        query {
          findOneUserOrFail(where: { name: { eq: "User 1" } }) {
            id
            name
          }
        }
      `)
      expect(data).toMatchInlineSnapshot(`
        {
          "findOneUserOrFail": {
            "id": "1",
            "name": "User 1",
          },
        }
      `)
      expect(logs).toMatchInlineSnapshot(`
        [
          "[query] select \`u0\`.\`id\`, \`u0\`.\`name\` from \`user\` as \`u0\` where \`u0\`.\`name\` = 'User 1' limit 1",
        ]
      `)
      await expect(
        execute(/* GraphQL */ `
          query {
            findOneUserOrFail(where: { name: { eq: "not exist" } }) {
              id
            }
          }
        `)
      ).rejects.toThrowError()
    })

    it("should query relations", async () => {
      const [data, logs] = await execute(/* GraphQL */ `
        query {
          findUser(where: { name: { eq: "User 1" } }) {
            posts {
              id
              title
              content
              author {
                name
              }
            }
          }
        }
      `)
      expect(data).toMatchInlineSnapshot(`
        {
          "findUser": [
            {
              "posts": [
                {
                  "author": {
                    "name": "User 1",
                  },
                  "content": "Content 1",
                  "id": "1",
                  "title": "Post 1",
                },
                {
                  "author": {
                    "name": "User 1",
                  },
                  "content": "Content 2",
                  "id": "2",
                  "title": "Post 2",
                },
              ],
            },
          ],
        }
      `)
      expect(logs).toMatchInlineSnapshot(`
        [
          "[query] select \`u0\`.\`id\` from \`user\` as \`u0\` where \`u0\`.\`name\` = 'User 1'",
          "[query] select \`p0\`.\`id\`, \`p0\`.\`title\`, \`p0\`.\`author_id\` from \`post\` as \`p0\` where \`p0\`.\`author_id\` in (1)",
          "[query] select \`p0\`.\`id\`, \`p0\`.\`title\`, \`p0\`.\`author_id\` from \`post\` as \`p0\` where \`p0\`.\`author_id\` in (1)",
          "[query] select \`p0\`.\`id\`, \`p0\`.\`content\` from \`post\` as \`p0\` where \`p0\`.\`id\` in (2)",
          "[query] select \`p0\`.\`id\`, \`p0\`.\`content\` from \`post\` as \`p0\` where \`p0\`.\`id\` in (1)",
        ]
      `)
    })

    it("should find entities by cursor", async () => {
      const [data, logs] = await execute(/* GraphQL */ `
        query {
          findUserByCursor(orderBy: { id: ASC }, first: 1) {
            items {
              id
            }
            startCursor
            endCursor
            hasNextPage
            hasPrevPage
            totalCount
          }
        }
      `)
      expect(data).toMatchInlineSnapshot(`
        {
          "findUserByCursor": {
            "endCursor": "WzFd",
            "hasNextPage": true,
            "hasPrevPage": false,
            "items": [
              {
                "id": "1",
              },
            ],
            "startCursor": "WzFd",
            "totalCount": 3,
          },
        }
      `)
      expect(logs).toMatchInlineSnapshot(`
        [
          "[query] select count(*) as \`count\` from \`user\` as \`u0\`",
          "[query] select \`u0\`.\`id\` from \`user\` as \`u0\` order by \`u0\`.\`id\` asc limit 2",
        ]
      `)
    })
  })

  describe("mutation", () => {
    const createMutationExecutor = async () => {
      const orm = await MikroORM.init(config)
      await orm.schema.refresh()
      const userResolver = new MikroResolverFactory(
        User,
        () => orm.em
      ).resolver("User")
      const postResolver = new MikroResolverFactory(
        Post,
        () => orm.em
      ).resolver("Post")
      const schema = weave(userResolver, postResolver)
      const execute = async (
        query: string,
        variables?: Record<string, any>
      ) => {
        const logs: string[] = []
        const response = await LogsStorage.run(logs, () =>
          executeGraphQL({
            schema,
            document: parse(query),
            variableValues: variables,
          })
        )
        if (response.errors) {
          throw response.errors[0]
        }
        return [response.data, logs] as const
      }
      return { execute, orm }
    }

    it("should create an entity", async () => {
      const { execute } = await createMutationExecutor()
      const [data, logs] = await execute(/* GraphQL */ `
        mutation {
          createUser(data: { name: "New User", email: "new@test.com" }) {
            id
            name
            email
          }
        }
      `)
      expect(data).toMatchInlineSnapshot(`
        {
          "createUser": {
            "email": "new@test.com",
            "id": "1",
            "name": "New User",
          },
        }
      `)
      expect(logs).toMatchInlineSnapshot(`
        [
          "[query] begin",
          "[query] insert into \`user\` (\`name\`, \`email\`) values ('New User', 'new@test.com') returning \`id\`",
          "[query] commit",
        ]
      `)
    })

    it("should insert an entity", async () => {
      const { execute } = await createMutationExecutor()
      const [data, logs] = await execute(/* GraphQL */ `
        mutation {
          insertUser(data: { name: "New User", email: "new@test.com" }) {
            id
            name
            email
          }
        }
      `)
      expect(data).toMatchInlineSnapshot(`
        {
          "insertUser": {
            "email": "new@test.com",
            "id": "1",
            "name": "New User",
          },
        }
      `)
      expect(logs).toMatchInlineSnapshot(`
        [
          "[query] insert into \`user\` (\`name\`, \`email\`) values ('New User', 'new@test.com') returning \`id\`",
          "[query] select \`u0\`.\`id\`, \`u0\`.\`name\`, \`u0\`.\`email\` from \`user\` as \`u0\` where \`u0\`.\`id\` = 1 limit 1",
        ]
      `)
    })

    it("should insert many entities", async () => {
      const { execute } = await createMutationExecutor()
      const [data, logs] = await execute(/* GraphQL */ `
        mutation {
          insertManyUser(
            data: [
              { name: "New User 1", email: "new1@test.com" }
              { name: "New User 2", email: "new2@test.com" }
            ]
          ) {
            id
            name
          }
        }
      `)
      expect(data).toMatchInlineSnapshot(`
        {
          "insertManyUser": [
            {
              "id": "1",
              "name": "New User 1",
            },
          ],
        }
      `)
      expect(logs).toMatchInlineSnapshot(`
        [
          "[query] insert into \`user\` (\`name\`, \`email\`) values ('New User 1', 'new1@test.com'), ('New User 2', 'new2@test.com') returning \`id\`",
          "[query] select \`u0\`.\`id\`, \`u0\`.\`name\` from \`user\` as \`u0\` where \`u0\`.\`id\` in (1)",
        ]
      `)
    })

    it("should update entities", async () => {
      const { execute } = await createMutationExecutor()
      await execute(/* GraphQL */ `
        mutation {
          insertUser(data: { id: 1, name: "Old Name", email: "old@test.com" }) {
            id
          }
        }
      `)
      const [data, logs] = await execute(/* GraphQL */ `
        mutation {
          updateUser(
            where: { name: { eq: "Old Name" } }
            data: { name: "New Name" }
          )
        }
      `)
      expect(data).toMatchInlineSnapshot(`
        {
          "updateUser": 1,
        }
      `)
      expect(logs).toMatchInlineSnapshot(`
        [
          "[query] update \`user\` set \`name\` = 'New Name' where \`name\` = 'Old Name'",
        ]
      `)
    })

    it("should delete entities", async () => {
      const { execute } = await createMutationExecutor()
      await execute(/* GraphQL */ `
        mutation {
          insertUser(data: { name: "To Delete", email: "delete@test.com" }) {
            id
          }
        }
      `)
      const [data, logs] = await execute(/* GraphQL */ `
        mutation {
          deleteUser(where: { name: { eq: "To Delete" } })
        }
      `)
      expect(data).toMatchInlineSnapshot(`
        {
          "deleteUser": 1,
        }
      `)
      expect(logs).toMatchInlineSnapshot(`
        [
          "[query] delete from \`user\` where \`name\` = 'To Delete'",
        ]
      `)
    })

    it("should upsert an entity (insert)", async () => {
      const { execute } = await createMutationExecutor()
      const [data, logs] = await execute(/* GraphQL */ `
        mutation {
          upsertUser(
            data: { id: 1, name: "Upsert User", email: "upsert@test.com" }
          ) {
            id
            name
          }
        }
      `)
      expect(data).toMatchInlineSnapshot(`
        {
          "upsertUser": {
            "id": "1",
            "name": "Upsert User",
          },
        }
      `)
      expect(logs).toMatchInlineSnapshot(`
        [
          "[query] insert into \`user\` (\`id\`, \`name\`, \`email\`) values ('1', 'Upsert User', 'upsert@test.com') on conflict (\`id\`) do update set \`name\` = excluded.\`name\`, \`email\` = excluded.\`email\`",
        ]
      `)
    })

    it("should upsert an entity (update)", async () => {
      const { execute } = await createMutationExecutor()
      await execute(/* GraphQL */ `
        mutation {
          insertUser(data: { id: 1, name: "Old Name", email: "old@test.com" }) {
            id
          }
        }
      `)
      const [data, logs] = await execute(/* GraphQL */ `
        mutation {
          upsertUser(data: { id: 1, name: "New Name", email: "new@test.com" }) {
            id
            name
          }
        }
      `)
      expect(data).toMatchInlineSnapshot(`
        {
          "upsertUser": {
            "id": "1",
            "name": "New Name",
          },
        }
      `)
      expect(logs).toMatchInlineSnapshot(`
        [
          "[query] insert into \`user\` (\`id\`, \`name\`, \`email\`) values ('1', 'New Name', 'new@test.com') on conflict (\`id\`) do update set \`name\` = excluded.\`name\`, \`email\` = excluded.\`email\`",
        ]
      `)
    })

    it("should upsert many entities", async () => {
      const { execute } = await createMutationExecutor()
      await execute(/* GraphQL */ `
        mutation {
          insertUser(data: { id: 1, name: "Old Name", email: "old@test.com" }) {
            id
          }
        }
      `)
      const [data, logs] = await execute(/* GraphQL */ `
        mutation {
          upsertManyUser(
            data: [
              { id: 1, name: "New Name", email: "new1@test.com" }
              { id: 2, name: "New User", email: "new2@test.com" }
            ]
          ) {
            id
            name
          }
        }
      `)
      expect(data).toMatchInlineSnapshot(`
        {
          "upsertManyUser": [
            {
              "id": "1",
              "name": "New Name",
            },
            {
              "id": "2",
              "name": "New User",
            },
          ],
        }
      `)
      expect(logs).toMatchInlineSnapshot(`
        [
          "[query] insert into \`user\` (\`id\`, \`name\`, \`email\`) values ('1', 'New Name', 'new1@test.com'), ('2', 'New User', 'new2@test.com') on conflict (\`id\`) do update set \`name\` = excluded.\`name\`, \`email\` = excluded.\`email\` returning \`id\`",
        ]
      `)
    })
  })
})
