import { weave } from "@gqloom/core"
import { type LibSQLDatabase, drizzle } from "drizzle-orm/libsql"
import {
  type GraphQLSchema,
  lexicographicSortSchema,
  printSchema,
} from "graphql"
import { type YogaServerInstance, createYoga } from "graphql-yoga"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { drizzleResolverFactory } from "../src"
import type * as schema from "./schema/sqlite"
import { posts, users } from "./schema/sqlite"
import { relations } from "./schema/sqlite-relations"

const pathToDB = new URL("./schema/sqlite-1.db", import.meta.url)

describe("resolver by sqlite", () => {
  let db: LibSQLDatabase<typeof schema, typeof relations>
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
    db = drizzle({
      relations,
      connection: { url: `file:${pathToDB.pathname}` },
      logger: { logQuery: (query) => logs.push(query) },
    })
    const userFactory = drizzleResolverFactory(db, users)
    const postFactory = drizzleResolverFactory(db, posts)
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

  beforeEach(() => {
    logs = []
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

  describe("query", () => {
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
      expect(["", ...logs, ""].join("\n")).toMatchInlineSnapshot(`
        "
        select "id", "name" from "users" where "users"."name" like ? order by "users"."name" asc
        select "id", "name" from "users" where "users"."name" like ? order by "users"."name" asc limit ?
        select "id", "name" from "users" where "users"."name" like ? order by "users"."name" asc limit ? offset ?
        "
      `)
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
      expect(["", ...logs, ""].join("\n")).toMatchInlineSnapshot(`
        "
        select "id", "name" from "users" where "users"."name" = ? limit ?
        "
      `)
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
      expect(["", ...logs, ""].join("\n")).toMatchInlineSnapshot(`
        "
        select "id", "name" from "users" where "users"."name" like ? order by "users"."name" asc
        select "d0"."id" as "id", "d0"."name" as "name", "d0"."age" as "age", "d0"."email" as "email", coalesce((select json_group_array(json_object('id', "id", 'title', "title", 'authorId', "authorId")) as "r" from (select "d1"."id" as "id", "d1"."title" as "title", "d1"."authorId" as "authorId" from "posts" as "d1" where "d0"."id" = "d1"."authorId") as "t"), jsonb_array()) as "posts" from "users" as "d0" where "d0"."id" in (?, ?, ?)
        "
      `)
    })
  })

  describe("mutation", () => {
    it("should insert a new user correctly", async () => {
      const q = /* GraphQL */ `
      mutation insertIntoUsers($values: [UserInsertInput!]!) {
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
      expect(["", ...logs, ""].join("\n")).toMatchInlineSnapshot(`
        "
        insert into "users" ("id", "name", "age", "email") values (null, ?, null, null) returning "id", "name"
        select "d0"."id" as "id", "d0"."name" as "name", "d0"."age" as "age", "d0"."email" as "email" from "users" as "d0" where "d0"."name" = ? limit ?
        "
      `)
    })

    it("should insert a user with on conflict correctly", async () => {
      const q = /* GraphQL */ `
        mutation insertIntoUsers($values: [UserInsertInput!]!, $doNothing: UserInsertOnConflictDoNothingInput, $doUpdate: UserInsertOnConflictDoUpdateInput) {
          insertIntoUsers(onConflictDoNothing: $doNothing, onConflictDoUpdate: $doUpdate, values: $values) {
            id
            name
          }
        }
      `

      await expect(
        execute(q, {
          values: [{ name: "Tina", id: 77 }],
        })
      ).resolves.toMatchObject({
        insertIntoUsers: [{ name: "Tina" }],
      })

      await expect(
        execute(q, {
          values: [{ name: "Tina", id: 77 }],
          doNothing: {},
        })
      ).resolves.toMatchObject({
        insertIntoUsers: [],
      })

      await expect(
        execute(q, {
          values: [{ name: "Tina", id: 77 }],
          doNothing: { target: ["id"] },
        })
      ).resolves.toMatchObject({
        insertIntoUsers: [],
      })

      await expect(
        execute(q, {
          values: [{ name: "TinaInsert", id: 77 }],
          doUpdate: {
            target: ["id"],
            set: { name: "TinaUpdate" },
          },
        })
      ).resolves.toMatchObject({
        insertIntoUsers: [{ name: "TinaUpdate" }],
      })
      expect(["", ...logs, ""].join("\n")).toMatchInlineSnapshot(`
        "
        insert into "users" ("id", "name", "age", "email") values (?, ?, null, null) returning "id", "name"
        insert into "users" ("id", "name", "age", "email") values (?, ?, null, null) on conflict do nothing returning "id", "name"
        insert into "users" ("id", "name", "age", "email") values (?, ?, null, null) on conflict ("users"."id") do nothing returning "id", "name"
        insert into "users" ("id", "name", "age", "email") values (?, ?, null, null) on conflict ("users"."id") do update set "name" = ? returning "id", "name"
        "
      `)
    })

    it("should insert a single user with on conflict correctly", async () => {
      const q = /* GraphQL */ `
        mutation insertIntoUsersSingle($value: UserInsertInput!, $doNothing: UserInsertOnConflictDoNothingInput, $doUpdate: UserInsertOnConflictDoUpdateInput) {
          insertIntoUsersSingle(onConflictDoNothing: $doNothing, onConflictDoUpdate: $doUpdate, value: $value) {
            id
            name
          }
        }
      `

      await expect(
        execute(q, {
          value: { name: "Tina", id: 78 },
        })
      ).resolves.toMatchObject({
        insertIntoUsersSingle: { name: "Tina" },
      })

      await expect(
        execute(q, {
          value: { name: "Tina", id: 78 },
          doNothing: {},
        })
      ).resolves.toMatchObject({
        insertIntoUsersSingle: null,
      })

      await expect(
        execute(q, {
          value: { name: "Tina", id: 78 },
          doNothing: { target: ["id"] },
        })
      ).resolves.toMatchObject({
        insertIntoUsersSingle: null,
      })

      await expect(
        execute(q, {
          value: { name: "Tina", id: 78 },
          doUpdate: {
            target: ["id"],
            set: { name: "TinaUpdate" },
          },
        })
      ).resolves.toMatchObject({
        insertIntoUsersSingle: { name: "TinaUpdate" },
      })
      expect(["", ...logs, ""].join("\n")).toMatchInlineSnapshot(`
        "
        insert into "users" ("id", "name", "age", "email") values (?, ?, null, null) returning "id", "name"
        insert into "users" ("id", "name", "age", "email") values (?, ?, null, null) on conflict do nothing returning "id", "name"
        insert into "users" ("id", "name", "age", "email") values (?, ?, null, null) on conflict ("users"."id") do nothing returning "id", "name"
        insert into "users" ("id", "name", "age", "email") values (?, ?, null, null) on conflict ("users"."id") do update set "name" = ? returning "id", "name"
        "
      `)
    })

    it("should update user information correctly", async () => {
      const q = /* GraphQL */ `
        mutation updateUsers($set: UserUpdateInput!, $where: UserFilters!) {
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
      expect(["", ...logs, ""].join("\n")).toMatchInlineSnapshot(`
        "
        insert into "users" ("id", "name", "age", "email") values (null, ?, null, null) returning "id", "name", "age", "email"
        update "users" set "name" = ? where "users"."id" = ? returning "id", "name"
        select "d0"."id" as "id", "d0"."name" as "name", "d0"."age" as "age", "d0"."email" as "email" from "users" as "d0" where "d0"."name" = ? limit ?
        "
      `)
    })

    it("should delete a user correctly", async () => {
      const q = /* GraphQL */ `
        mutation deleteFromUsers($where: UserFilters!) {
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
      expect(["", ...logs, ""].join("\n")).toMatchInlineSnapshot(`
        "
        select "d0"."id" as "id", "d0"."name" as "name", "d0"."age" as "age", "d0"."email" as "email" from "users" as "d0" where "d0"."name" = ? limit ?
        delete from "users" where "users"."id" = ? returning "id", "name"
        select "d0"."id" as "id", "d0"."name" as "name", "d0"."age" as "age", "d0"."email" as "email" from "users" as "d0" where "d0"."name" = ? limit ?
        "
      `)
    })

    it("should insert a new post correctly", async () => {
      const q = /* GraphQL */ `
        mutation insertIntoPosts($values: [PostInsertInput!]!) {
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
      expect(["", ...logs, ""].join("\n")).toMatchInlineSnapshot(`
        "
        select "d0"."id" as "id", "d0"."name" as "name", "d0"."age" as "age", "d0"."email" as "email" from "users" as "d0" where "d0"."name" = ? limit ?
        insert into "posts" ("id", "title", "content", "authorId", "reviewerId") values (null, ?, null, ?, null) returning "id", "title", "authorId"
        select "d0"."id" as "id", "d0"."title" as "title", "d0"."content" as "content", "d0"."authorId" as "authorId", "d0"."reviewerId" as "reviewerId" from "posts" as "d0" where "d0"."title" = ? limit ?
        "
      `)
    })

    it("should update post information correctly", async () => {
      const q = /* GraphQL */ `
        mutation updatePosts($set: PostUpdateInput!, $where: PostFilters!) {
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
      expect(["", ...logs, ""].join("\n")).toMatchInlineSnapshot(`
        "
        insert into "posts" ("id", "title", "content", "authorId", "reviewerId") values (null, ?, null, null, null) returning "id", "title", "content", "authorId", "reviewerId"
        update "posts" set "title" = ? where "posts"."id" = ? returning "id", "title"
        select "d0"."id" as "id", "d0"."title" as "title", "d0"."content" as "content", "d0"."authorId" as "authorId", "d0"."reviewerId" as "reviewerId" from "posts" as "d0" where "d0"."title" = ? limit ?
        "
      `)
    })

    it("should delete a post correctly", async () => {
      const q = /* GraphQL */ `
        mutation deleteFromPosts($where: PostFilters!) {
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
      expect(["", ...logs, ""].join("\n")).toMatchInlineSnapshot(`
        "
        insert into "posts" ("id", "title", "content", "authorId", "reviewerId") values (null, ?, null, null, null) returning "id", "title", "content", "authorId", "reviewerId"
        delete from "posts" where "posts"."id" = ? returning "id", "title"
        select "d0"."id" as "id", "d0"."title" as "title", "d0"."content" as "content", "d0"."authorId" as "authorId", "d0"."reviewerId" as "reviewerId" from "posts" as "d0" where "d0"."id" = ? limit ?
        "
      `)
    })
  })
})
