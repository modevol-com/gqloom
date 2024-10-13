import { describe, it, expect } from "vitest"
import * as g from "./generated"
import { PrismaTypeWeaver } from "../src"
import { printType } from "graphql"

describe("PrismaModelTypeWeaver", () => {
  it("should be able to create a type weaver", () => {
    const typeWeaver = new PrismaTypeWeaver(g.User.data)
    expect(typeWeaver).toBeDefined()
  })

  it("should be able to create WhereInput", () => {
    const typeWeaver = new PrismaTypeWeaver(g.User.data)
    const UserWhereInput = typeWeaver.inputType("UserWhereInput")
    expect(printType(UserWhereInput)).toMatchInlineSnapshot(`
      "type UserWhereInput {
        AND: [UserWhereInput!]
        OR: [UserWhereInput!]
        NOT: [UserWhereInput!]
        id: IntFilter
        email: StringFilter
        name: StringNullableFilter
        posts: PostListRelationFilter
        publishedPosts: PostListRelationFilter
        Profile: ProfileNullableRelationFilter
      }"
    `)
  })

  it("should be able to create ScaleFilter", () => {
    const typeWeaver = new PrismaTypeWeaver(g.User.data)
    const IntFilter = typeWeaver.inputType("IntFilter")
    expect(printType(IntFilter)).toMatchInlineSnapshot(`
      "type IntFilter {
        equals: Int
        in: [Int!]
        notIn: [Int!]
        lt: Int
        lte: Int
        gt: Int
        gte: Int
        not: NestedIntFilter
      }"
    `)
  })
})
