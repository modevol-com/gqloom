import { weave } from "@gqloom/core"
import { type LibSQLDatabase, drizzle } from "drizzle-orm/libsql"
import {
  type GraphQLSchema,
  lexicographicSortSchema,
  printSchema,
} from "graphql"
import { type YogaServerInstance, createYoga } from "graphql-yoga"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { drizzleResolverFactory } from "../src"
import * as schema from "./schema/sqlite"
import { posts, users } from "./schema/sqlite"
import { relations } from "./schema/sqlite-relations"

const pathToDB = new URL("./schema/sqlite-1.db", import.meta.url)

describe("resolver by sqlite", () => {
  let db: LibSQLDatabase<typeof schema, typeof relations>
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

    if (response.status !== 200) {
      throw new Error(JSON.stringify(errors))
    }
    return data
  }

  beforeAll(async () => {
    db = drizzle({
      schema,
      relations,
      connection: { url: `file:${pathToDB.pathname}` },
    })
    const userFactory = drizzleResolverFactory(db, "users")
    const postFactory = drizzleResolverFactory(db, "posts")
    gqlSchema = weave(userFactory.resolver(), postFactory.resolver())
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
  })

  afterAll(async () => {
    await db.delete(posts)
    await db.delete(users)
  })

  it("should weave GraphQL schema correctly", async () => {
    await expect(
      printSchema(lexicographicSortSchema(gqlSchema))
    ).toMatchFileSnapshot("./resolver-sqlite.spec.gql")
  })

  describe.concurrent("query", () => {
    it("should query users correctly", async () => {
      const q = /* GraphQL */ `
      query users ($orderBy: UsersOrderBy, $where: UsersFilters!, $limit: Int, $offset: Int) {
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
          query users ($orderBy: UsersOrderBy, $where: UsersFilters!, $offset: Int) {
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
        query users ($orderBy: UsersOrderBy, $where: UsersFilters!, $limit: Int, $offset: Int) {
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
      mutation insertIntoUsers($values: [UsersInsertInput!]!) {
        insertIntoUsers(values: $values) {
          id
          name
        }
      }
    `

      await expect(
        execute(q, {
          values: [{ name: "Tina" }],
        })
      ).resolves.toMatchObject({
        insertIntoUsers: [{ name: "Tina" }],
      })

      // Verify the user was inserted
      const Tina = await db.query.users.findFirst({
        where: { name: "Tina" },
      })
      expect(Tina).toBeDefined()
    })

    it("should update user information correctly", async () => {
      const q = /* GraphQL */ `
        mutation updateUsers($set: UsersUpdateInput!, $where: UsersFilters!) {
          updateUsers(set: $set, where: $where) {
            id
            name
          }
        }
      `

      const [Troy] = await db.insert(users).values({ name: "Troy" }).returning()
      if (!Troy) throw new Error("User not found")

      await expect(
        execute(q, {
          set: { name: "Tiffany" },
          where: { id: { eq: Troy.id } },
        })
      ).resolves.toMatchObject({
        updateUsers: [{ id: Troy.id, name: "Tiffany" }],
      })

      // Verify the user was updated
      const updatedUser = await db.query.users.findFirst({
        where: { name: "Tiffany" },
      })
      expect(updatedUser).toBeDefined()
    })

    it("should delete a user correctly", async () => {
      const q = /* GraphQL */ `
        mutation deleteFromUsers($where: UsersFilters!) {
          deleteFromUsers(where: $where) {
            id
            name
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
        deleteFromUsers: [{ id: Tony.id, name: "Tony" }],
      })

      // Verify the user was deleted
      const deletedUser = await db.query.users.findFirst({
        where: { name: "Tony" },
      })
      expect(deletedUser).toBeUndefined()
    })

    it("should insert a new post correctly", async () => {
      const q = /* GraphQL */ `
        mutation insertIntoPosts($values: [PostsInsertInput!]!) {
          insertIntoPosts(values: $values) {
            id
            title
            authorId
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
        insertIntoPosts: [{ title: "Post 5", authorId: Tom.id }],
      })

      // Verify the post was inserted
      const p = await db.query.posts.findFirst({
        where: { title: "Post 5" },
      })
      expect(p).toBeDefined()
    })

    it("should update post information correctly", async () => {
      const q = /* GraphQL */ `
        mutation updatePosts($set: PostsUpdateInput!, $where: PostsFilters!) {
          updatePosts(set: $set, where: $where) {
            id
            title
          }
        }
      `

      const [PostU] = await db
        .insert(posts)
        .values({ title: "Post U" })
        .returning()
      if (!PostU) throw new Error("Post not found")

      await expect(
        execute(q, {
          set: { title: "Updated Post U" },
          where: { id: { eq: PostU.id } },
        })
      ).resolves.toMatchObject({
        updatePosts: [{ id: PostU.id, title: "Updated Post U" }],
      })

      // Verify the post was updated
      const updatedPost = await db.query.posts.findFirst({
        where: { title: "Updated Post U" },
      })
      expect(updatedPost).toBeDefined()
    })

    it("should delete a post correctly", async () => {
      const q = /* GraphQL */ `
        mutation deleteFromPosts($where: PostsFilters!) {
          deleteFromPosts(where: $where) {
            id
            title
          }
        }
      `

      const [PostD] = await db
        .insert(posts)
        .values({ title: "Post D" })
        .returning()
      if (!PostD) throw new Error("Post not found")

      await expect(
        execute(q, {
          where: { id: { eq: PostD.id } },
        })
      ).resolves.toMatchObject({
        deleteFromPosts: [{ id: PostD.id, title: "Post D" }],
      })

      // Verify the post was deleted
      const deletedPost = await db.query.posts.findFirst({
        where: { id: PostD.id },
      })
      expect(deletedPost).toBeUndefined()
    })
  })
})
