import { describe, it, expect, beforeEach } from "vitest"
import * as g from "./generated"
import { PrismaClient } from "@prisma/client"
import {
  PrismaModelBobbin,
  PrismaModelTypeBuilder,
  type PrismaModelSilk,
} from "../src"
import { type InferSilkO, loom, weave } from "@gqloom/core"
import { createYoga } from "graphql-yoga"
import { printType, GraphQLInt, GraphQLString, GraphQLID } from "graphql"

const { resolver, query } = loom

class TestablePrismaModelBobbin<
  TModalSilk extends PrismaModelSilk<any, any>,
> extends PrismaModelBobbin<TModalSilk> {
  public uniqueWhere(instance: InferSilkO<NonNullable<TModalSilk>>): any {
    return super.uniqueWhere(instance)
  }
}

describe("PrismaModelTypeBuilder", () => {
  it("should be able to create a type builder", () => {
    const UserTypeBuilder = new PrismaModelTypeBuilder(g.User)
    expect(UserTypeBuilder).toBeDefined()
  })

  it("should be able to create scalar filter", () => {
    const stringFilter = PrismaModelTypeBuilder.scalarFilter(GraphQLString)
    expect(printType(stringFilter)).toMatchInlineSnapshot(`
      "type StringFilter {
        equals: String
        in: [String!]
        notIn: [String!]
        lt: String
        lte: String
        gt: String
        gte: String
        not: StringFilter
        contains: String
        startsWith: String
        endsWith: String
      }"
    `)

    const intFilter = PrismaModelTypeBuilder.scalarFilter(GraphQLInt)
    expect(printType(intFilter)).toMatchInlineSnapshot(`
      "type IntFilter {
        equals: Int
        in: [Int!]
        notIn: [Int!]
        lt: Int
        lte: Int
        gt: Int
        gte: Int
        not: IntFilter
      }"
    `)

    const idFilter = PrismaModelTypeBuilder.scalarFilter(GraphQLID)
    expect(printType(idFilter)).toMatchInlineSnapshot(`
      "type IDFilter {
        equals: ID
        in: [ID!]
        notIn: [ID!]
        lt: ID
        lte: ID
        gt: ID
        gte: ID
        not: IDFilter
      }"
    `)
  })

  it("should be able to create whereInput", () => {
    const UserTypeBuilder = new PrismaModelTypeBuilder(g.User)
    expect(printType(UserTypeBuilder.whereInput())).toMatchInlineSnapshot(`
      "type UserWhereInput {
        AND: [UserWhereInput!]
        OR: [UserWhereInput!]
        NOT: [UserWhereInput!]
        id: IDFilter
        email: StringFilter
        name: StringFilter
        posts: PostListRelationFilter
        Profile: ProfileWhereInput
      }"
    `)
  })

  it("should be able to create primaryKeyInput", () => {
    const DogTypeBuilder = new PrismaModelTypeBuilder(g.Dog)
    expect(printType(DogTypeBuilder.primaryKeyInput()!)).toMatchInlineSnapshot(`
      "type DogFullNameInput {
        firstName: String
        lastName: String
      }"
    `)

    const CatTypeBuilder = new PrismaModelTypeBuilder(g.Cat)
    expect(printType(CatTypeBuilder.primaryKeyInput()!)).toMatchInlineSnapshot(`
      "type CatFirstName_lastNameInput {
        firstName: String
        lastName: String
      }"
    `)
  })

  it("should be able to create whereUniqueInput", () => {
    const UserTypeBuilder = new PrismaModelTypeBuilder(g.User)
    expect(printType(UserTypeBuilder.whereInput({ unique: true })))
      .toMatchInlineSnapshot(`
      "type UserWhereUniqueInput {
        AND: [UserWhereInput!]
        OR: [UserWhereInput!]
        NOT: [UserWhereInput!]
        id: ID
        email: StringFilter
        name: StringFilter
        posts: PostListRelationFilter
        Profile: ProfileWhereInput
      }"
    `)

    expect(
      printType(UserTypeBuilder.whereInput({ unique: true, model: "Cat" }))
    ).toMatchInlineSnapshot(`
      "type CatWhereUniqueInput {
        AND: [CatWhereInput!]
        OR: [CatWhereInput!]
        NOT: [CatWhereInput!]
        firstName: StringFilter
        lastName: StringFilter
        firstName_lastName: CatFirstName_lastNameInput
      }"
    `)

    expect(
      printType(UserTypeBuilder.whereInput({ unique: true, model: "Dog" }))
    ).toMatchInlineSnapshot(`
      "type DogWhereUniqueInput {
        AND: [DogWhereInput!]
        OR: [DogWhereInput!]
        NOT: [DogWhereInput!]
        firstName: StringFilter
        lastName: StringFilter
        fullName: DogFullNameInput
      }"
    `)
  })
})

describe("PrismaModelBobbin", () => {
  const db = new PrismaClient()

  it("should be able to create a bobbin", () => {
    const UserBobbin = new TestablePrismaModelBobbin(g.User, db)
    expect(UserBobbin).toBeDefined()
  })

  it("should be able to create a uniqueWhere condition", () => {
    const UserBobbin = new TestablePrismaModelBobbin(g.User, db)
    const userCondition = UserBobbin.uniqueWhere({
      id: 4,
      name: "",
      email: "",
    })
    expect(userCondition).toEqual({ id: 4 })

    const CatBobbin = new TestablePrismaModelBobbin(g.Cat, db)
    const catCondition = CatBobbin.uniqueWhere({
      firstName: "foo",
      lastName: "bar",
    })
    expect(catCondition).toEqual({
      firstName_lastName: { firstName: "foo", lastName: "bar" },
    })

    const DogBobbin = new TestablePrismaModelBobbin(g.Dog, db)
    const dogCondition = DogBobbin.uniqueWhere({
      firstName: "foo",
      lastName: "bar",
    })
    expect(dogCondition).toEqual({
      fullName: {
        firstName: "foo",
        lastName: "bar",
      },
    })
  })

  describe("relationField", () => {
    beforeEach(async () => {
      await db.user.deleteMany()
      await db.post.deleteMany()
    })
    const UserBobbin = new PrismaModelBobbin(g.User, db)
    const PostBobbin = new PrismaModelBobbin(g.Post, db)
    it("should be able to create a relationField", () => {
      const postsField = UserBobbin.relationField("posts")
      expect(postsField).toBeDefined()
      expect(postsField.output).toBeTypeOf("object")
      expect(postsField.type).toEqual("field")
      expect(postsField.resolve).toBeTypeOf("function")

      const userField = PostBobbin.relationField("author")
      expect(userField).toBeDefined()
      expect(userField.output).toBeTypeOf("object")
      expect(userField.type).toEqual("field")
      expect(userField.resolve).toBeTypeOf("function")
    })

    it("should be able to resolve a relationField", async () => {
      await db.user.create({
        data: {
          name: "John",
          email: "john@example.com",
          posts: {
            create: [{ title: "Hello World" }, { title: "Hello GQLoom" }],
          },
        },
      })

      const r1 = resolver.of(g.User, {
        users: query(g.User.list(), () => db.user.findMany()),

        posts: UserBobbin.relationField("posts"),
      })

      const r2 = resolver.of(g.Post, {
        posts: query(g.Post.list(), () => db.post.findMany()),

        author: PostBobbin.relationField("author"),
      })
      const schema = weave(r1, r2)
      const yoga = createYoga({ schema })
      const response = await yoga.fetch("http://localhost/graphql", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          query: /* GraphQL */ `
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
          `,
        }),
      })

      if (response.status !== 200) throw new Error("unexpected")
      const json = await response.json()
      expect(json).toMatchObject({
        data: {
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
        },
      })
    })
  })

  describe("countQuery", () => {
    it("should be able to create a countQuery", () => {})
  })
})
