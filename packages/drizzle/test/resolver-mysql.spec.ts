import { weave } from "@gqloom/core"
import { drizzle } from "drizzle-orm/mysql2"
import type { MySql2Database } from "drizzle-orm/mysql2"
import {
  type GraphQLSchema,
  lexicographicSortSchema,
  printSchema,
} from "graphql"
import { type YogaServerInstance, createYoga } from "graphql-yoga"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { config } from "../env.config"
import { drizzleResolverFactory } from "../src"
import { posts, users } from "./schema/mysql"
import { relations } from "./schema/mysql-relations"

const schema = {
  users,
  posts,
}

describe("resolver by mysql", () => {
  let db: MySql2Database<typeof schema, typeof relations>
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
      db = drizzle(config.mysqlUrl, { relations, mode: "default" })
      const userFactory = drizzleResolverFactory(db, users)
      const postFactory = drizzleResolverFactory(db, posts)
      gqlSchema = weave(
        userFactory.resolver({ name: "users" }),
        postFactory.resolver({ name: "posts" })
      )
      yoga = createYoga({ schema: gqlSchema })

      await db
        .insert(users)
        .values([{ name: "Tom" }, { name: "Tony" }, { name: "Taylor" }])
      const Tom = await db.query.users.findFirst({
        where: { name: "Tom" },
      })
      const Tony = await db.query.users.findFirst({
        where: { name: "Tony" },
      })
      const Taylor = await db.query.users.findFirst({
        where: { name: "Taylor" },
      })
      if (!Tom || !Tony || !Taylor) throw new Error("User not found")

      await db.insert(posts).values([
        { title: "Post 1", authorId: Tom.id },
        { title: "Post 2", authorId: Tony.id },
        { title: "Post 3", authorId: Taylor.id },
        { title: "Post 4", authorId: Tom.id },
      ])
    } catch (error) {
      console.info(error)
    }
  })

  afterAll(async () => {
    await db.delete(posts)
    await db.delete(users)
  })

  it("should weave GraphQL schema correctly", async () => {
    await expect(
      printSchema(lexicographicSortSchema(gqlSchema))
    ).toMatchFileSnapshot("./resolver-mysql.spec.gql")
  })

  describe.concurrent("query", () => {
    it("should query users correctly", async () => {
      const q = /* GraphQL */ `
      query users ($orderBy: UserOrderBy, $where: UserFilters!, $limit: Int, $offset: Int) {
        users(orderBy: $orderBy, where: $where, limit: $limit, offset: $offset) {
          id
          name
        }
      }
      `
      await expect(
        execute(q, {
          orderBy: { name: "asc" },
          where: { name: { like: "T%" } },
        })
      ).resolves.toMatchObject({
        users: [{ name: "Taylor" }, { name: "Tom" }, { name: "Tony" }],
      })

      await expect(
        execute(q, {
          orderBy: { name: "asc" },
          where: { name: { like: "T%" } },
          limit: 2,
        })
      ).resolves.toMatchObject({
        users: [{ name: "Taylor" }, { name: "Tom" }],
      })

      await expect(
        execute(q, {
          orderBy: { name: "asc" },
          where: { name: { like: "T%" } },
          limit: 1,
          offset: 1,
        })
      ).resolves.toMatchObject({
        users: [{ name: "Tom" }],
      })
    })

    it("should query user single correctly", async () => {
      await expect(
        execute(
          /* GraphQL */ `
          query users ($orderBy: UserOrderBy, $where: UserFilters!, $offset: Int) {
            usersSingle(orderBy: $orderBy, where: $where, offset: $offset) {
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
        usersSingle: { name: "Taylor" },
      })
    })

    it("should query user with posts correctly", async () => {
      const q = /* GraphQL */ `
        query users ($orderBy: UserOrderBy, $where: UserFilters!, $limit: Int, $offset: Int) {
          users(orderBy: $orderBy,where: $where, limit: $limit, offset: $offset) {
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
          orderBy: { name: "asc" },
          where: { name: { like: "T%" } },
        })
      ).resolves.toMatchObject({
        users: [
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
    })
  })

  describe("mutation", () => {
    it("should insert a new user correctly", async () => {
      const q = /* GraphQL */ `
      mutation insertIntoUsers($values: [UserInsertInput!]!) {
        insertIntoUsers(values: $values) {
          isSuccess
        }
      }
      `

      await expect(
        execute(q, {
          values: [{ name: "Tina" }],
        })
      ).resolves.toMatchObject({
        insertIntoUsers: { isSuccess: true },
      })

      // Verify the user was inserted
      const Tina = await db.query.users.findFirst({
        where: { name: "Tina" },
      })
      expect(Tina).toBeDefined()
    })

    it("should update user information correctly", async () => {
      const q = /* GraphQL */ `
        mutation updateUser($set: UserUpdateInput!, $where: UserFilters!) {
          updateUsers(set: $set, where: $where) {
            isSuccess
          }
        }
      `

      const [TroyID] = await db
        .insert(users)
        .values({ name: "Troy" })
        .$returningId()
      const Troy = await db.query.users.findFirst({
        where: { id: TroyID.id },
      })
      if (!Troy) throw new Error("User not found")

      await expect(
        execute(q, {
          set: { name: "Tiffany" },
          where: { id: { eq: Troy.id } },
        })
      ).resolves.toMatchObject({
        updateUsers: { isSuccess: true },
      })

      // Verify the user was updated
      const updatedUser = await db.query.users.findFirst({
        where: { name: "Tiffany" },
      })
      expect(updatedUser).toBeDefined()
    })

    it("should delete a user correctly", async () => {
      const q = /* GraphQL */ `
        mutation deleteFromUsers($where: UserFilters!) {
          deleteFromUsers(where: $where) {
            isSuccess
          }
        }
      `

      const Tony = await db.query.users.findFirst({
        where: { name: "Tony" },
      })
      if (!Tony) throw new Error("User not found")

      await expect(
        execute(q, {
          where: { id: { eq: Tony.id } },
        })
      ).resolves.toMatchObject({
        deleteFromUsers: {
          isSuccess: true,
        },
      })

      // Verify the user was deleted
      const deletedUser = await db.query.users.findFirst({
        where: { name: "Tony" },
      })
      expect(deletedUser).toBeUndefined()
    })

    it("should insert a new post correctly", async () => {
      const q = /* GraphQL */ `
        mutation insertIntoPosts($values: [PostInsertInput!]!) {
          insertIntoPosts(values: $values) {
            isSuccess
          }
        }
      `

      const Tom = await db.query.users.findFirst({
        where: { name: "Tom" },
      })
      if (!Tom) throw new Error("User not found")

      await expect(
        execute(q, {
          values: [{ title: "Post 5", authorId: Tom.id }],
        })
      ).resolves.toMatchObject({
        insertIntoPosts: {
          isSuccess: true,
        },
      })

      // Verify the post was inserted
      const p = await db.query.posts.findFirst({
        where: { title: "Post 5" },
      })
      expect(p).toBeDefined()
    })

    it("should update post information correctly", async () => {
      const q = /* GraphQL */ `
        mutation updatePosts($set: PostUpdateInput!, $where: PostFilters!) {
          updatePosts(set: $set, where: $where) {
            isSuccess
          }
        }
      `

      const [PostUID] = await db
        .insert(posts)
        .values({ title: "Post U" })
        .$returningId()

      const PostU = await db.query.posts.findFirst({
        where: { id: PostUID.id },
      })
      if (!PostU) throw new Error("Post not found")

      await expect(
        execute(q, {
          set: { title: "Updated Post U" },
          where: { id: { eq: PostU.id } },
        })
      ).resolves.toMatchObject({
        updatePosts: { isSuccess: true },
      })

      // Verify the post was updated
      const updatedPost = await db.query.posts.findFirst({
        where: { title: "Updated Post U" },
      })
      expect(updatedPost).toBeDefined()
    })

    it("should delete a post correctly", async () => {
      const q = /* GraphQL */ `
        mutation deleteFromPosts($where: PostFilters!) {
          deleteFromPosts(where: $where) {
            isSuccess
          }
        }
      `

      const [PostDID] = await db
        .insert(posts)
        .values({ title: "Post D" })
        .$returningId()

      const PostD = await db.query.posts.findFirst({
        where: { id: PostDID.id },
      })
      if (!PostD) throw new Error("Post not found")

      await expect(
        execute(q, {
          where: { id: { eq: PostD.id } },
        })
      ).resolves.toMatchObject({
        deleteFromPosts: { isSuccess: true },
      })

      // Verify the post was deleted
      const deletedPost = await db.query.posts.findFirst({
        where: { id: PostD.id },
      })
      expect(deletedPost).toBeUndefined()
    })
  })
})
