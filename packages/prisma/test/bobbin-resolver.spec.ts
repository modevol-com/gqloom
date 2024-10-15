import { describe, it, expect } from "vitest"
import { PrismaModelBobbin } from "../src"
import * as p from "./generated"
import { PrismaClient } from "@prisma/client"
import { weave } from "@gqloom/core"
import { lexicographicSortSchema, printSchema, printType } from "graphql"

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

  it("should be able to weave schema", () => {
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

    expect(printSchema(lexicographicSortSchema(schema))).toMatchFileSnapshot(
      "./bobbin-resolver.spec.gql"
    )
  })
})
