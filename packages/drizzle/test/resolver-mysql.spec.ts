import { weave } from "@gqloom/core"
import { eq } from "drizzle-orm"
import type { MySql2Database } from "drizzle-orm/mysql2"
import { drizzle } from "drizzle-orm/mysql2"
import {
  type GraphQLSchema,
  lexicographicSortSchema,
  printSchema,
} from "graphql"
import { createYoga, type YogaServerInstance } from "graphql-yoga"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { config } from "../env.config"
import { drizzleResolverFactory } from "../src"
import { post, postsRelations, user, usersRelations } from "./schema/mysql"

const schema = {
  drizzle_user: user,
  drizzle_post: post,
  usersRelations,
  postsRelations,
}

describe.runIf(config.mysqlUrl)("resolver by mysql", () => {
  let db: MySql2Database<typeof schema>
  let logs: string[] = []
  let gqlSchema: GraphQLSchema
  let yoga: YogaServerInstance<{}, {}>

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

    if (response.status !== 200 || errors != null) {
      console.info(errors)
      throw new Error(JSON.stringify(errors))
    }
    return data
  }

  beforeAll(async () => {
    try {
      db = drizzle(config.mysqlUrl, {
        schema,
        mode: "default",
        logger: { logQuery: (query) => logs.push(query) },
      })
      const userFactory = drizzleResolverFactory(db, "drizzle_user")
      const postFactory = drizzleResolverFactory(db, "drizzle_post")
      gqlSchema = weave(
        userFactory.resolver({ name: "user" }),
        postFactory.resolver({ name: "post" })
      )
      yoga = createYoga({ schema: gqlSchema })

      await db
        .insert(user)
        .values([{ name: "Tom" }, { name: "Tony" }, { name: "Taylor" }])
      const Tom = await db.query.drizzle_user.findFirst({
        where: eq(user.name, "Tom"),
      })
      const Tony = await db.query.drizzle_user.findFirst({
        where: eq(user.name, "Tony"),
      })
      const Taylor = await db.query.drizzle_user.findFirst({
        where: eq(user.name, "Taylor"),
      })
      if (!Tom || !Tony || !Taylor) throw new Error("User not found")

      await db.insert(post).values([
        { title: "Post 1", authorId: Tom.id },
        { title: "Post 2", authorId: Tony.id },
        { title: "Post 3", authorId: Taylor.id },
        { title: "Post 4", authorId: Tom.id },
      ])
    } catch (error) {
      console.info(error)
    }
  })

  beforeEach(() => {
    logs = []
  })

  afterAll(async () => {
    await db.delete(post)
    await db.delete(user)
  })

  it("should weave GraphQL schema correctly", async () => {
    await expect(
      printSchema(lexicographicSortSchema(gqlSchema))
    ).toMatchFileSnapshot("./resolver-mysql.spec.gql")
  })

  describe("query", () => {
    it("should query users correctly", async () => {
      const q = /* GraphQL */ `
      query user ($orderBy: [UserOrderBy!], $where: UserFilters!, $limit: Int, $offset: Int) {
        user(orderBy: $orderBy, where: $where, limit: $limit, offset: $offset) {
          id
          name
        }
      }
    `
      await expect(
        execute(q, {
          orderBy: [{ name: "asc" }],
          where: { name: { like: "T%" } },
        })
      ).resolves.toMatchObject({
        user: [{ name: "Taylor" }, { name: "Tom" }, { name: "Tony" }],
      })

      await expect(
        execute(q, {
          orderBy: [{ name: "asc" }],
          where: { name: { like: "T%" } },
          limit: 2,
        })
      ).resolves.toMatchObject({
        user: [{ name: "Taylor" }, { name: "Tom" }],
      })

      await expect(
        execute(q, {
          orderBy: [{ name: "asc" }],
          where: { name: { like: "T%" } },
          limit: 1,
          offset: 1,
        })
      ).resolves.toMatchObject({
        user: [{ name: "Tom" }],
      })
      expect(["", ...logs, ""].join("\n")).toMatchInlineSnapshot(`
        "
        select \`id\`, \`name\` from \`drizzle_user\` where \`drizzle_user\`.\`name\` like ? order by \`drizzle_user\`.\`name\` asc
        select \`id\`, \`name\` from \`drizzle_user\` where \`drizzle_user\`.\`name\` like ? order by \`drizzle_user\`.\`name\` asc limit ?
        select \`id\`, \`name\` from \`drizzle_user\` where \`drizzle_user\`.\`name\` like ? order by \`drizzle_user\`.\`name\` asc limit ? offset ?
        "
      `)
    })

    it("should query user single correctly", async () => {
      await expect(
        execute(
          /* GraphQL */ `
          query user ($orderBy: [UserOrderBy!], $where: UserFilters!, $offset: Int) {
            userSingle(orderBy: $orderBy, where: $where, offset: $offset) {
              id
              name
            }
          }
        `,
          {
            where: { name: { eq: "Taylor" } },
          }
        )
      ).resolves.toMatchObject({
        userSingle: { name: "Taylor" },
      })
      expect(["", ...logs, ""].join("\n")).toMatchInlineSnapshot(`
        "
        select \`id\`, \`name\` from \`drizzle_user\` where \`drizzle_user\`.\`name\` = ? limit ?
        "
      `)
    })

    it("should query user with posts correctly", async () => {
      const q = /* GraphQL */ `
        query user ($orderBy: [UserOrderBy!], $where: UserFilters!, $limit: Int, $offset: Int) {
          user(orderBy: $orderBy,where: $where, limit: $limit, offset: $offset) {
            id
            name
            posts {
              id
              title
            }
          }
        }
      `

      await expect(
        execute(q, {
          orderBy: [{ name: "asc" }],
          where: { name: { like: "T%" } },
        })
      ).resolves.toMatchObject({
        user: [
          {
            name: "Taylor",
            posts: [{ title: "Post 3" }],
          },
          {
            name: "Tom",
            posts: [{ title: "Post 1" }, { title: "Post 4" }],
          },
          {
            name: "Tony",
            posts: [{ title: "Post 2" }],
          },
        ],
      })

      expect(["", ...logs, ""].join("\n")).toMatchInlineSnapshot(`
        "
        select \`id\`, \`name\` from \`drizzle_user\` where \`drizzle_user\`.\`name\` like ? order by \`drizzle_user\`.\`name\` asc
        select \`id\`, \`title\`, \`authorId\` from \`drizzle_post\` where \`drizzle_post\`.\`authorId\` in (?, ?, ?)
        "
      `)
    })
  })

  describe("mutation", () => {
    it("should insert a new user correctly", async () => {
      const q = /* GraphQL */ `
      mutation insertIntoUser($values: [UserInsertInput!]!) {
        insertIntoUser(values: $values) {
          isSuccess
        }
      }
    `

      await expect(
        execute(q, {
          values: [{ name: "Tina" }],
        })
      ).resolves.toMatchObject({
        insertIntoUser: { isSuccess: true },
      })

      // Verify the user was inserted
      const Tina = await db.query.drizzle_user.findFirst({
        where: eq(user.name, "Tina"),
      })
      expect(Tina).toBeDefined()
      expect(["", ...logs, ""].join("\n")).toMatchInlineSnapshot(`
        "
        insert into \`drizzle_user\` (\`id\`, \`name\`, \`age\`, \`email\`) values (default, ?, default, default)
        select \`id\`, \`name\`, \`age\`, \`email\` from \`drizzle_user\` \`drizzle_user\` where \`drizzle_user\`.\`name\` = ? limit ?
        "
      `)
    })

    it("should update user information correctly", async () => {
      const q = /* GraphQL */ `
        mutation updateUser($set: UserUpdateInput!, $where: UserFilters!) {
          updateUser(set: $set, where: $where) {
            isSuccess
          }
        }
      `

      const [TroyID] = await db
        .insert(user)
        .values({ name: "Troy" })
        .$returningId()
      const Troy = await db.query.drizzle_user.findFirst({
        where: eq(user.id, TroyID.id),
      })
      if (!Troy) throw new Error("User not found")

      await expect(
        execute(q, {
          set: { name: "Tiffany" },
          where: { id: { eq: Troy.id } },
        })
      ).resolves.toMatchObject({
        updateUser: { isSuccess: true },
      })

      // Verify the user was updated
      const updatedUser = await db.query.drizzle_user.findFirst({
        where: eq(user.name, "Tiffany"),
      })
      expect(updatedUser).toBeDefined()
      expect(["", ...logs, ""].join("\n")).toMatchInlineSnapshot(`
        "
        insert into \`drizzle_user\` (\`id\`, \`name\`, \`age\`, \`email\`) values (default, ?, default, default)
        select \`id\`, \`name\`, \`age\`, \`email\` from \`drizzle_user\` \`drizzle_user\` where \`drizzle_user\`.\`id\` = ? limit ?
        update \`drizzle_user\` set \`name\` = ? where \`drizzle_user\`.\`id\` = ?
        select \`id\`, \`name\`, \`age\`, \`email\` from \`drizzle_user\` \`drizzle_user\` where \`drizzle_user\`.\`name\` = ? limit ?
        "
      `)
    })

    it("should delete a user correctly", async () => {
      const q = /* GraphQL */ `
        mutation deleteFromUser($where: UserFilters!) {
          deleteFromUser(where: $where) {
            isSuccess
          }
        }
      `

      const Tony = await db.query.drizzle_user.findFirst({
        where: eq(user.name, "Tony"),
      })
      if (!Tony) throw new Error("User not found")

      await expect(
        execute(q, {
          where: { id: { eq: Tony.id } },
        })
      ).resolves.toMatchObject({
        deleteFromUser: {
          isSuccess: true,
        },
      })

      // Verify the user was deleted
      const deletedUser = await db.query.drizzle_user.findFirst({
        where: eq(user.name, "Tony"),
      })
      expect(deletedUser).toBeUndefined()
      expect(["", ...logs, ""].join("\n")).toMatchInlineSnapshot(`
        "
        select \`id\`, \`name\`, \`age\`, \`email\` from \`drizzle_user\` \`drizzle_user\` where \`drizzle_user\`.\`name\` = ? limit ?
        delete from \`drizzle_user\` where \`drizzle_user\`.\`id\` = ?
        select \`id\`, \`name\`, \`age\`, \`email\` from \`drizzle_user\` \`drizzle_user\` where \`drizzle_user\`.\`name\` = ? limit ?
        "
      `)
    })

    it("should insert a new post correctly", async () => {
      const q = /* GraphQL */ `
        mutation insertIntoPost($values: [PostInsertInput!]!) {
          insertIntoPost(values: $values) {
            isSuccess
          }
        }
      `

      const Tom = await db.query.drizzle_user.findFirst({
        where: eq(user.name, "Tom"),
      })
      if (!Tom) throw new Error("User not found")

      await expect(
        execute(q, {
          values: [{ title: "Post 5", authorId: Tom.id }],
        })
      ).resolves.toMatchObject({
        insertIntoPost: {
          isSuccess: true,
        },
      })

      // Verify the post was inserted
      const p = await db.query.drizzle_post.findFirst({
        where: eq(post.title, "Post 5"),
      })
      expect(p).toBeDefined()
      expect(["", ...logs, ""].join("\n")).toMatchInlineSnapshot(`
        "
        select \`id\`, \`name\`, \`age\`, \`email\` from \`drizzle_user\` \`drizzle_user\` where \`drizzle_user\`.\`name\` = ? limit ?
        insert into \`drizzle_post\` (\`id\`, \`title\`, \`content\`, \`authorId\`) values (default, ?, default, ?)
        select \`id\`, \`title\`, \`content\`, \`authorId\` from \`drizzle_post\` \`drizzle_post\` where \`drizzle_post\`.\`title\` = ? limit ?
        "
      `)
    })

    it("should update post information correctly", async () => {
      const q = /* GraphQL */ `
        mutation updatePost($set: PostUpdateInput!, $where: PostFilters!) {
          updatePost(set: $set, where: $where) {
            isSuccess
          }
        }
      `

      const [PostUID] = await db
        .insert(post)
        .values({ title: "Post U" })
        .$returningId()

      const PostU = await db.query.drizzle_post.findFirst({
        where: eq(post.id, PostUID.id),
      })
      if (!PostU) throw new Error("Post not found")

      await expect(
        execute(q, {
          set: { title: "Updated Post U" },
          where: { id: { eq: PostU.id } },
        })
      ).resolves.toMatchObject({
        updatePost: { isSuccess: true },
      })

      // Verify the post was updated
      const updatedPost = await db.query.drizzle_post.findFirst({
        where: eq(post.title, "Updated Post U"),
      })
      expect(updatedPost).toBeDefined()
      expect(["", ...logs, ""].join("\n")).toMatchInlineSnapshot(`
        "
        insert into \`drizzle_post\` (\`id\`, \`title\`, \`content\`, \`authorId\`) values (default, ?, default, default)
        select \`id\`, \`title\`, \`content\`, \`authorId\` from \`drizzle_post\` \`drizzle_post\` where \`drizzle_post\`.\`id\` = ? limit ?
        update \`drizzle_post\` set \`title\` = ? where \`drizzle_post\`.\`id\` = ?
        select \`id\`, \`title\`, \`content\`, \`authorId\` from \`drizzle_post\` \`drizzle_post\` where \`drizzle_post\`.\`title\` = ? limit ?
        "
      `)
    })

    it("should delete a post correctly", async () => {
      const q = /* GraphQL */ `
        mutation deleteFromPost($where: PostFilters!) {
          deleteFromPost(where: $where) {
            isSuccess
          }
        }
      `

      const [PostDID] = await db
        .insert(post)
        .values({ title: "Post D" })
        .$returningId()

      const PostD = await db.query.drizzle_post.findFirst({
        where: eq(post.id, PostDID.id),
      })
      if (!PostD) throw new Error("Post not found")

      await expect(
        execute(q, {
          where: { id: { eq: PostD.id } },
        })
      ).resolves.toMatchObject({
        deleteFromPost: { isSuccess: true },
      })

      // Verify the post was deleted
      const deletedPost = await db.query.drizzle_post.findFirst({
        where: eq(post.id, PostD.id),
      })
      expect(deletedPost).toBeUndefined()
      expect(["", ...logs, ""].join("\n")).toMatchInlineSnapshot(`
        "
        insert into \`drizzle_post\` (\`id\`, \`title\`, \`content\`, \`authorId\`) values (default, ?, default, default)
        select \`id\`, \`title\`, \`content\`, \`authorId\` from \`drizzle_post\` \`drizzle_post\` where \`drizzle_post\`.\`id\` = ? limit ?
        delete from \`drizzle_post\` where \`drizzle_post\`.\`id\` = ?
        select \`id\`, \`title\`, \`content\`, \`authorId\` from \`drizzle_post\` \`drizzle_post\` where \`drizzle_post\`.\`id\` = ? limit ?
        "
      `)
    })
  })
})
