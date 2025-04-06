import { weave } from "@gqloom/core"
import { type NodePgDatabase, drizzle } from "drizzle-orm/node-postgres"
import {
  type GraphQLSchema,
  lexicographicSortSchema,
  printSchema,
} from "graphql"
import { type YogaServerInstance, createYoga } from "graphql-yoga"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { config } from "../env.config"
import { drizzleResolverFactory } from "../src"
import { post, user } from "./schema/postgres"
import { relations } from "./schema/postgres-relations"

const schema = { user, post }

describe("resolver by postgres", () => {
  let db: NodePgDatabase<typeof schema, typeof relations>
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
      db = drizzle(config.postgresUrl, { schema, relations })
      const userFactory = drizzleResolverFactory(db, "user")
      const postFactory = drizzleResolverFactory(db, "post")
      gqlSchema = weave(
        userFactory.resolver({ name: "user" }),
        postFactory.resolver({ name: "post" })
      )
      yoga = createYoga({ schema: gqlSchema })

      await db
        .insert(user)
        .values([{ name: "Tom" }, { name: "Tony" }, { name: "Taylor" }])
      const Tom = await db.query.user.findFirst({
        where: { name: "Tom" },
      })
      const Tony = await db.query.user.findFirst({
        where: { name: "Tony" },
      })
      const Taylor = await db.query.user.findFirst({
        where: { name: "Taylor" },
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

  afterAll(async () => {
    await db.delete(post)
    await db.delete(user)
  })

  it("should weave GraphQL schema correctly", async () => {
    await expect(
      printSchema(lexicographicSortSchema(gqlSchema))
    ).toMatchFileSnapshot("./resolver-postgres.spec.gql")
  })

  describe.concurrent("query", () => {
    it("should query users correctly", async () => {
      const q = /* GraphQL */ `
        query user(
          $orderBy: UserOrderBy
          $where: UserFilters!
          $limit: Int
          $offset: Int
        ) {
          user(
            orderBy: $orderBy
            where: $where
            limit: $limit
            offset: $offset
          ) {
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
        user: [{ name: "Taylor" }, { name: "Tom" }, { name: "Tony" }],
      })

      await expect(
        execute(q, {
          orderBy: { name: "asc" },
          where: { name: { like: "T%" } },
          limit: 2,
        })
      ).resolves.toMatchObject({
        user: [{ name: "Taylor" }, { name: "Tom" }],
      })

      await expect(
        execute(q, {
          orderBy: { name: "asc" },
          where: { name: { like: "T%" } },
          limit: 1,
          offset: 1,
        })
      ).resolves.toMatchObject({
        user: [{ name: "Tom" }],
      })
    })

    it("should query user single correctly", async () => {
      await expect(
        execute(
          /* GraphQL */ `
            query user(
              $orderBy: UserOrderBy
              $where: UserFilters!
              $offset: Int
            ) {
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
    })

    it("should query user with posts correctly", async () => {
      const q = /* GraphQL */ `
        query user(
          $orderBy: UserOrderBy
          $where: UserFilters!
          $limit: Int
          $offset: Int
        ) {
          user(
            orderBy: $orderBy
            where: $where
            limit: $limit
            offset: $offset
          ) {
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
    })
  })

  describe("mutation", () => {
    it("should insert a new user correctly", async () => {
      const q = /* GraphQL */ `
        mutation insertIntoUser($values: [UserInsertInput!]!) {
          insertIntoUser(values: $values) {
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
        insertIntoUser: [{ name: "Tina" }],
      })

      // Verify the user was inserted
      const Tina = await db.query.user.findFirst({
        where: { name: "Tina" },
      })
      expect(Tina).toBeDefined()
    })

    it("should update user information correctly", async () => {
      const q = /* GraphQL */ `
        mutation updateUser(
          $set: UserUpdateInput!
          $where: UserFilters!
        ) {
          updateUser(set: $set, where: $where) {
            id
            name
          }
        }
      `

      const [TroyID] = await db
        .insert(user)
        .values({ name: "Troy" })
        .returning()
      const Troy = await db.query.user.findFirst({
        where: { id: TroyID.id },
      })
      if (!Troy) throw new Error("User not found")

      await expect(
        execute(q, {
          set: { name: "Tiffany" },
          where: { id: { eq: Troy.id } },
        })
      ).resolves.toMatchObject({
        updateUser: [{ id: Troy.id, name: "Tiffany" }],
      })

      // Verify the user was updated
      const updatedUser = await db.query.user.findFirst({
        where: { name: "Tiffany" },
      })
      expect(updatedUser).toBeDefined()
    })

    it("should delete a user correctly", async () => {
      const q = /* GraphQL */ `
        mutation deleteFromUser($where: UserFilters!) {
          deleteFromUser(where: $where) {
            id
            name
          }
        }
      `

      const Tony = await db.query.user.findFirst({
        where: { name: "Tony" },
      })
      if (!Tony) throw new Error("User not found")

      await expect(
        execute(q, {
          where: { id: { eq: Tony.id } },
        })
      ).resolves.toMatchObject({
        deleteFromUser: [{ id: Tony.id, name: "Tony" }],
      })

      // Verify the user was deleted
      const deletedUser = await db.query.user.findFirst({
        where: { name: "Tony" },
      })
      expect(deletedUser).toBeUndefined()
    })

    it("should insert a new post correctly", async () => {
      const q = /* GraphQL */ `
        mutation insertIntoPost($values: [PostInsertInput!]!) {
          insertIntoPost(values: $values) {
            id
            title
            authorId
          }
        }
      `

      const Tom = await db.query.user.findFirst({
        where: { name: "Tom" },
      })
      if (!Tom) throw new Error("User not found")

      await expect(
        execute(q, {
          values: [{ title: "Post 5", authorId: Tom.id }],
        })
      ).resolves.toMatchObject({
        insertIntoPost: [{ title: "Post 5", authorId: Tom.id }],
      })

      // Verify the post was inserted
      const p = await db.query.post.findFirst({
        where: { title: "Post 5" },
      })
      expect(p).toBeDefined()
    })

    it("should update post information correctly", async () => {
      const q = /* GraphQL */ `
        mutation updatePost(
          $set: PostUpdateInput!
          $where: PostFilters!
        ) {
          updatePost(set: $set, where: $where) {
            id
            title
          }
        }
      `

      const [PostUID] = await db
        .insert(post)
        .values({ title: "Post U" })
        .returning()

      const PostU = await db.query.post.findFirst({
        where: { id: PostUID.id },
      })
      if (!PostU) throw new Error("Post not found")

      await expect(
        execute(q, {
          set: { title: "Updated Post U" },
          where: { id: { eq: PostU.id } },
        })
      ).resolves.toMatchObject({
        updatePost: [{ id: PostU.id, title: "Updated Post U" }],
      })

      // Verify the post was updated
      const updatedPost = await db.query.post.findFirst({
        where: { title: "Updated Post U" },
      })
      expect(updatedPost).toBeDefined()
    })

    it("should delete a post correctly", async () => {
      const q = /* GraphQL */ `
        mutation deleteFromPost($where: PostFilters!) {
          deleteFromPost(where: $where) {
            id
            title
          }
        }
      `

      const [PostDID] = await db
        .insert(post)
        .values({ title: "Post D" })
        .returning()

      const PostD = await db.query.post.findFirst({
        where: { id: PostDID.id },
      })
      if (!PostD) throw new Error("Post not found")

      await expect(
        execute(q, {
          where: { id: { eq: PostD.id } },
        })
      ).resolves.toMatchObject({
        deleteFromPost: [{ id: PostD.id, title: "Post D" }],
      })

      // Verify the post was deleted
      const deletedPost = await db.query.post.findFirst({
        where: { id: PostD.id },
      })
      expect(deletedPost).toBeUndefined()
    })
  })
})
