import { describe, it, expect } from "vitest"
import * as g from "./generated"
import { PrismaTypeWeaver, PrismaActionArgsWeaver } from "../src"
import { printType } from "graphql"

describe("PrismaModelTypeWeaver", () => {
  const typeWeaver = new PrismaTypeWeaver(g.User.data)
  it("should be able to create a type weaver", () => {
    expect(typeWeaver).toBeDefined()
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
          Profile: ProfileNullableRelationFilter
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
          publishedPosts: PostCreateNestedManyWithoutPublishedByInput
          Profile: ProfileCreateNestedOneWithoutUserInput
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

describe("PrismaActionArgsWeaver", () => {
  it("should be able to create countArgs", () => {
    const UserTypeBuilder = new PrismaActionArgsWeaver(g.User)
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
    const UserTypeBuilder = new PrismaActionArgsWeaver(g.User)
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
    const UserTypeBuilder = new PrismaActionArgsWeaver(g.User)
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
    const UserTypeBuilder = new PrismaActionArgsWeaver(g.User)
    expect(printType(UserTypeBuilder.findUniqueArgs())).toMatchInlineSnapshot(`
      "type UserFindUniqueArgs {
        where: UserWhereUniqueInput
      }"
    `)
  })

  it("should be able to create createArgs", () => {
    const UserTypeBuilder = new PrismaActionArgsWeaver(g.User)
    expect(printType(UserTypeBuilder.createArgs())).toMatchInlineSnapshot(`
      "type UserCreateArgs {
        data: UserCreateInput!
      }"
    `)
  })

  it("should be able to create createManyArgs", () => {
    const UserTypeBuilder = new PrismaActionArgsWeaver(g.User)
    expect(printType(UserTypeBuilder.createManyArgs())).toMatchInlineSnapshot(`
      "type UserCreateManyArgs {
        data: [UserCreateManyInput!]!
      }"
    `)
  })

  it("should be able to create deleteArgs", () => {
    const UserTypeBuilder = new PrismaActionArgsWeaver(g.User)

    expect(printType(UserTypeBuilder.deleteArgs())).toMatchInlineSnapshot(`
      "type UserDeleteArgs {
        where: UserWhereUniqueInput!
      }"
    `)
  })

  it("should be able to create deleteManyArgs", () => {
    const UserTypeBuilder = new PrismaActionArgsWeaver(g.User)

    expect(printType(UserTypeBuilder.deleteManyArgs())).toMatchInlineSnapshot(`
      "type UserDeleteManyArgs {
        where: UserWhereInput
      }"
    `)
  })

  it("should be able to create updateArgs", () => {
    const UserTypeBuilder = new PrismaActionArgsWeaver(g.User)

    expect(printType(UserTypeBuilder.updateArgs())).toMatchInlineSnapshot(`
      "type UserUpdateArgs {
        data: UserUpdateInput!
        where: UserWhereUniqueInput!
      }"
    `)
  })

  it("should be able to create updateManyArgs", () => {
    const UserTypeBuilder = new PrismaActionArgsWeaver(g.User)

    expect(printType(UserTypeBuilder.updateManyArgs())).toMatchInlineSnapshot(`
      "type UserUpdateManyArgs {
        data: UserUpdateManyMutationInput!
        where: UserWhereInput
      }"
    `)
  })

  it("should be able to create upsertArgs", () => {
    const UserTypeBuilder = new PrismaActionArgsWeaver(g.User)

    expect(printType(UserTypeBuilder.upsertArgs())).toMatchInlineSnapshot(`
      "type UserUpsertArgs {
        where: UserWhereUniqueInput!
        create: UserCreateInput!
        update: UserUpdateInput!
      }"
    `)
  })
})
