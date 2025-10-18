import { isSilk } from "@gqloom/core"
import { printType } from "graphql"
import { describe, expect, it } from "vitest"
import { PrismaActionArgsFactory, PrismaTypeFactory } from "../src"
import * as g from "./generated"

describe("PrismaTypeFactory", () => {
  const typeWeaver = new PrismaTypeFactory(g.User)
  it("should be able to create a type weaver", () => {
    expect(typeWeaver).toBeDefined()
  })

  describe("getSilk", () => {
    it("should return a valid GraphQL silk", () => {
      const whereInputSilk = typeWeaver.getSilk("UserWhereInput")
      expect(isSilk(whereInputSilk)).toBe(true)
    })

    it("should create silk that delegates to inputType method", () => {
      const whereInputSilk = typeWeaver.getSilk("UserWhereInput")
      expect(isSilk(whereInputSilk)).toBe(true)

      const whereInputType = typeWeaver.inputType("UserWhereInput")
      expect(printType(whereInputType)).toMatchInlineSnapshot(`
        "type UserWhereInput {
          AND: [UserWhereInput!]
          OR: [UserWhereInput!]
          NOT: [UserWhereInput!]
          id: IntFilter
          email: StringFilter
          name: StringNullableFilter
          posts: PostListRelationFilter
          publishedPosts: PostListRelationFilter
          profile: ProfileNullableScalarRelationFilter
        }"
      `)
    })

    it("should work with different input types", () => {
      const createInputSilk = typeWeaver.getSilk("UserCreateInput")
      expect(isSilk(createInputSilk)).toBe(true)

      const createInputType = typeWeaver.inputType("UserCreateInput")
      expect(printType(createInputType)).toMatchInlineSnapshot(`
        "type UserCreateInput {
          email: String!
          name: String
          posts: PostCreateNestedManyWithoutAuthorInput
          publishedPosts: PostCreateNestedManyWithoutPublisherInput
          profile: ProfileCreateNestedOneWithoutUserInput
        }"
      `)
    })
  })

  describe("inputType", () => {
    it("should be able to create WhereInput", () => {
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
          profile: ProfileNullableScalarRelationFilter
        }"
      `)
    })

    it("should be able to create ScaleFilter", () => {
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

    it("should be able to create CreateInput", () => {
      const UserCreateInput = typeWeaver.inputType("UserCreateInput")
      expect(printType(UserCreateInput)).toMatchInlineSnapshot(`
        "type UserCreateInput {
          email: String!
          name: String
          posts: PostCreateNestedManyWithoutAuthorInput
          publishedPosts: PostCreateNestedManyWithoutPublisherInput
          profile: ProfileCreateNestedOneWithoutUserInput
        }"
      `)
    })
    it("should be able to create CreateManyInput", () => {
      const UserCreateManyInput = typeWeaver.inputType("UserCreateManyInput")
      expect(printType(UserCreateManyInput)).toMatchInlineSnapshot(`
        "type UserCreateManyInput {
          id: Int
          email: String!
          name: String
        }"
      `)
    })

    it("should be able to create UpdateManyMutationInput", () => {
      const UserUpdateManyMutationInput = typeWeaver.inputType(
        "UserUpdateManyMutationInput"
      )
      expect(printType(UserUpdateManyMutationInput)).toMatchInlineSnapshot(`
        "type UserUpdateManyMutationInput {
          email: StringFieldUpdateOperationsInput
          name: NullableStringFieldUpdateOperationsInput
        }"
      `)
    })
  })

  describe("enumType", () => {
    it("should be able to create enum type", () => {
      const SortOrder = typeWeaver.enumType("SortOrder")

      expect(printType(SortOrder)).toMatchInlineSnapshot(`
        "enum SortOrder {
          asc
          desc
        }"
      `)
    })
  })
})

describe("PrismaActionArgsFactory", () => {
  it("should be able to create countArgs", () => {
    const UserTypeBuilder = new PrismaActionArgsFactory(g.User)
    expect(printType(UserTypeBuilder.countArgs())).toMatchInlineSnapshot(`
      "type UserCountArgs {
        where: UserWhereInput
        orderBy: [UserOrderByWithRelationInput!]
        cursor: UserWhereUniqueInput
        skip: Int
        take: Int
      }"
    `)
  })

  it("should be able to create findFirstArgs", () => {
    const UserTypeBuilder = new PrismaActionArgsFactory(g.User)
    expect(printType(UserTypeBuilder.findFirstArgs())).toMatchInlineSnapshot(`
      "type UserFindFirstArgs {
        where: UserWhereInput
        orderBy: [UserOrderByWithRelationInput!]
        cursor: UserWhereUniqueInput
        skip: Int
        take: Int
        distinct: [UserScalarFieldEnum!]
      }"
    `)
  })

  it("should be able to create findManyArgs", () => {
    const UserTypeBuilder = new PrismaActionArgsFactory(g.User)
    expect(printType(UserTypeBuilder.findManyArgs())).toMatchInlineSnapshot(`
      "type UserFindManyArgs {
        where: UserWhereInput
        orderBy: [UserOrderByWithRelationInput!]
        cursor: UserWhereUniqueInput
        skip: Int
        take: Int
        distinct: [UserScalarFieldEnum!]
      }"
    `)
  })

  it("should be able to create findUniqueArgs", () => {
    const UserTypeBuilder = new PrismaActionArgsFactory(g.User)
    expect(printType(UserTypeBuilder.findUniqueArgs())).toMatchInlineSnapshot(`
      "type UserFindUniqueArgs {
        where: UserWhereUniqueInput
      }"
    `)
  })

  it("should be able to create createArgs", () => {
    const UserTypeBuilder = new PrismaActionArgsFactory(g.User)
    expect(printType(UserTypeBuilder.createArgs())).toMatchInlineSnapshot(`
      "type UserCreateArgs {
        data: UserCreateInput!
      }"
    `)
  })

  it("should be able to create createManyArgs", () => {
    const UserTypeBuilder = new PrismaActionArgsFactory(g.User)
    expect(printType(UserTypeBuilder.createManyArgs())).toMatchInlineSnapshot(`
      "type UserCreateManyArgs {
        data: [UserCreateManyInput!]!
      }"
    `)
  })

  it("should be able to create deleteArgs", () => {
    const UserTypeBuilder = new PrismaActionArgsFactory(g.User)

    expect(printType(UserTypeBuilder.deleteArgs())).toMatchInlineSnapshot(`
      "type UserDeleteArgs {
        where: UserWhereUniqueInput!
      }"
    `)
  })

  it("should be able to create deleteManyArgs", () => {
    const UserTypeBuilder = new PrismaActionArgsFactory(g.User)

    expect(printType(UserTypeBuilder.deleteManyArgs())).toMatchInlineSnapshot(`
      "type UserDeleteManyArgs {
        where: UserWhereInput
      }"
    `)
  })

  it("should be able to create updateArgs", () => {
    const UserTypeBuilder = new PrismaActionArgsFactory(g.User)

    expect(printType(UserTypeBuilder.updateArgs())).toMatchInlineSnapshot(`
      "type UserUpdateArgs {
        data: UserUpdateInput!
        where: UserWhereUniqueInput!
      }"
    `)
  })

  it("should be able to create updateManyArgs", () => {
    const UserTypeBuilder = new PrismaActionArgsFactory(g.User)

    expect(printType(UserTypeBuilder.updateManyArgs())).toMatchInlineSnapshot(`
      "type UserUpdateManyArgs {
        data: UserUpdateManyMutationInput!
        where: UserWhereInput
      }"
    `)
  })

  it("should be able to create upsertArgs", () => {
    const UserTypeBuilder = new PrismaActionArgsFactory(g.User)

    expect(printType(UserTypeBuilder.upsertArgs())).toMatchInlineSnapshot(`
      "type UserUpsertArgs {
        where: UserWhereUniqueInput!
        create: UserCreateInput!
        update: UserUpdateInput!
      }"
    `)
  })
})
