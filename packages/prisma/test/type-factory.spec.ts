import { isSilk, query, resolver, weave } from "@gqloom/core"
import { ZodWeaver } from "@gqloom/zod"
import { GraphQLScalarType, printType } from "graphql"
import { describe, expect, it } from "vitest"
import * as z from "zod"
import { PrismaActionArgsFactory, PrismaTypeFactory } from "../src"
import type { PrismaInputOperation } from "../src/types"
import * as g from "./generated"

describe("PrismaTypeFactory", () => {
  const typeFactory = new PrismaTypeFactory(g.User)

  describe("getOperationByName", () => {
    const INPUT_OPERATIONS_FROM_RESOLVER_SPEC_GQL: [
      string,
      PrismaInputOperation,
    ][] = [
      ["CategoryCreateNestedManyWithoutPostsInput", "filters"],
      ["CategoryCreateOrConnectWithoutPostsInput", "filters"],
      ["CategoryListRelationFilter", "filters"],
      ["CategoryOrderByRelationAggregateInput", "filters"],
      ["CategoryScalarWhereInput", "filters"],
      ["CategoryUpdateManyWithoutPostsNestedInput", "filters"],
      ["CategoryUpdateManyWithWhereWithoutPostsInput", "filters"],
      ["CategoryUpdateWithWhereUniqueWithoutPostsInput", "filters"],
      ["CategoryUpsertWithWhereUniqueWithoutPostsInput", "update"],
      ["CategoryWhereInput", "filters"],
      ["CategoryWhereUniqueInput", "filters"],
      ["DogCreateInput", "create"],
      ["DogCreateManyInput", "create"],
      ["DogCreateNestedOneWithoutSheepsInput", "filters"],
      ["DogCreateOrConnectWithoutSheepsInput", "filters"],
      ["DogCreateWithoutSheepsInput", "create"],
      ["DogFullNameCompoundUniqueInput", "filters"],
      ["DogOrderByWithRelationInput", "filters"],
      ["DogScalarRelationFilter", "filters"],
      ["DogUpdateInput", "update"],
      ["DogUpdateManyMutationInput", "update"],
      ["DogUpdateOneRequiredWithoutSheepsNestedInput", "filters"],
      ["DogUpdateToOneWithWhereWithoutSheepsInput", "filters"],
      ["DogUpdateWithoutSheepsInput", "update"],
      ["DogUpsertWithoutSheepsInput", "update"],
      ["DogWhereInput", "filters"],
      ["DogWhereUniqueInput", "filters"],
      ["PostCreateInput", "create"],
      ["PostCreateManyAuthorInput", "filters"],
      ["PostCreateManyAuthorInputEnvelope", "filters"],
      ["PostCreateManyInput", "create"],
      ["PostCreateManyPublisherInput", "filters"],
      ["PostCreateManyPublisherInputEnvelope", "filters"],
      ["PostCreateNestedManyWithoutAuthorInput", "filters"],
      ["PostCreateNestedManyWithoutPublisherInput", "filters"],
      ["PostCreateOrConnectWithoutAuthorInput", "filters"],
      ["PostCreateOrConnectWithoutPublisherInput", "filters"],
      ["PostCreateWithoutAuthorInput", "create"],
      ["PostCreateWithoutPublisherInput", "create"],
      ["PostListRelationFilter", "filters"],
      ["PostOrderByRelationAggregateInput", "filters"],
      ["PostOrderByWithRelationInput", "filters"],
      ["PostScalarWhereInput", "filters"],
      ["PostUpdateInput", "update"],
      ["PostUpdateManyMutationInput", "update"],
      ["PostUpdateManyWithoutAuthorNestedInput", "filters"],
      ["PostUpdateManyWithoutPublisherNestedInput", "filters"],
      ["PostUpdateManyWithWhereWithoutAuthorInput", "filters"],
      ["PostUpdateManyWithWhereWithoutPublisherInput", "filters"],
      ["PostUpdateWithoutAuthorInput", "update"],
      ["PostUpdateWithoutPublisherInput", "update"],
      ["PostUpdateWithWhereUniqueWithoutAuthorInput", "filters"],
      ["PostUpdateWithWhereUniqueWithoutPublisherInput", "filters"],
      ["PostUpsertWithWhereUniqueWithoutAuthorInput", "update"],
      ["PostUpsertWithWhereUniqueWithoutPublisherInput", "update"],
      ["PostWhereInput", "filters"],
      ["PostWhereUniqueInput", "filters"],
      ["ProfileCreateInput", "create"],
      ["ProfileCreateManyInput", "create"],
      ["ProfileCreateNestedOneWithoutUserInput", "filters"],
      ["ProfileCreateOrConnectWithoutUserInput", "filters"],
      ["ProfileCreateWithoutUserInput", "create"],
      ["ProfileNullableScalarRelationFilter", "filters"],
      ["ProfileOrderByWithRelationInput", "filters"],
      ["ProfileUpdateInput", "update"],
      ["ProfileUpdateManyMutationInput", "update"],
      ["ProfileUpdateOneWithoutUserNestedInput", "filters"],
      ["ProfileUpdateToOneWithWhereWithoutUserInput", "filters"],
      ["ProfileUpdateWithoutUserInput", "update"],
      ["ProfileUpsertWithoutUserInput", "update"],
      ["ProfileWhereInput", "filters"],
      ["ProfileWhereUniqueInput", "filters"],
      ["SheepCreateInput", "create"],
      ["SheepCreateManyInput", "create"],
      ["SheepCreateManyShepherdInput", "filters"],
      ["SheepCreateManyShepherdInputEnvelope", "filters"],
      ["SheepCreateNestedManyWithoutShepherdInput", "filters"],
      ["SheepCreateOrConnectWithoutShepherdInput", "filters"],
      ["SheepCreateWithoutShepherdInput", "create"],
      ["SheepFirstCodeLastCodeCompoundUniqueInput", "filters"],
      ["SheepListRelationFilter", "filters"],
      ["SheepOrderByRelationAggregateInput", "filters"],
      ["SheepOrderByWithRelationInput", "filters"],
      ["SheepScalarWhereInput", "filters"],
      ["SheepUpdateInput", "update"],
      ["SheepUpdateManyMutationInput", "update"],
      ["SheepUpdateManyWithoutShepherdNestedInput", "filters"],
      ["SheepUpdateManyWithWhereWithoutShepherdInput", "filters"],
      ["SheepUpdateWithoutShepherdInput", "update"],
      ["SheepUpdateWithWhereUniqueWithoutShepherdInput", "filters"],
      ["SheepUpsertWithWhereUniqueWithoutShepherdInput", "update"],
      ["SheepWhereInput", "filters"],
      ["SheepWhereUniqueInput", "filters"],
      ["SortOrderInput", "filters"],
      ["UserCreateInput", "create"],
      ["UserCreateManyInput", "create"],
      ["UserCreateNestedOneWithoutPostsInput", "filters"],
      ["UserCreateNestedOneWithoutProfileInput", "filters"],
      ["UserCreateNestedOneWithoutPublishedPostsInput", "filters"],
      ["UserCreateOrConnectWithoutPostsInput", "filters"],
      ["UserCreateOrConnectWithoutProfileInput", "filters"],
      ["UserCreateOrConnectWithoutPublishedPostsInput", "filters"],
      ["UserCreateWithoutPostsInput", "create"],
      ["UserCreateWithoutProfileInput", "create"],
      ["UserCreateWithoutPublishedPostsInput", "create"],
      ["UserNullableScalarRelationFilter", "filters"],
      ["UserOrderByWithRelationInput", "filters"],
      ["UserScalarRelationFilter", "filters"],
      ["UserUpdateInput", "update"],
      ["UserUpdateManyMutationInput", "update"],
      ["UserUpdateOneRequiredWithoutPostsNestedInput", "filters"],
      ["UserUpdateOneRequiredWithoutProfileNestedInput", "filters"],
      ["UserUpdateOneWithoutPublishedPostsNestedInput", "filters"],
      ["UserUpdateToOneWithWhereWithoutPostsInput", "filters"],
      ["UserUpdateToOneWithWhereWithoutProfileInput", "filters"],
      ["UserUpdateToOneWithWhereWithoutPublishedPostsInput", "filters"],
      ["UserUpdateWithoutPostsInput", "update"],
      ["UserUpdateWithoutProfileInput", "update"],
      ["UserUpdateWithoutPublishedPostsInput", "update"],
      ["UserUpsertWithoutPostsInput", "update"],
      ["UserUpsertWithoutProfileInput", "update"],
      ["UserUpsertWithoutPublishedPostsInput", "update"],
      ["UserWhereInput", "filters"],
      ["UserWhereUniqueInput", "filters"],
    ]
    it.each(
      INPUT_OPERATIONS_FROM_RESOLVER_SPEC_GQL
    )("returns %s for input %s", (inputName, expectedOperation) => {
      expect(PrismaTypeFactory.getOperationByName(inputName)).toBe(
        expectedOperation
      )
    })

    it("handles edge cases where model names conflict with keywords", () => {
      // Model name is "Upsert"
      expect(PrismaTypeFactory.getOperationByName("UpsertWhereInput")).toBe(
        "filters"
      )
      expect(
        PrismaTypeFactory.getOperationByName("UpsertOrderByWithRelationInput")
      ).toBe("filters")
      expect(PrismaTypeFactory.getOperationByName("UpsertCreateInput")).toBe(
        "create"
      )
      expect(PrismaTypeFactory.getOperationByName("UpsertUpdateInput")).toBe(
        "update"
      )

      // Model name is "CreateWithout"
      expect(
        PrismaTypeFactory.getOperationByName("CreateWithoutWhereInput")
      ).toBe("filters")
      expect(
        PrismaTypeFactory.getOperationByName("CreateWithoutCreateInput")
      ).toBe("create")

      // Model name is "UpdateWithout"
      expect(
        PrismaTypeFactory.getOperationByName("UpdateWithoutWhereInput")
      ).toBe("filters")
      expect(
        PrismaTypeFactory.getOperationByName("UpdateWithoutUpdateInput")
      ).toBe("update")
    })
  })
  it("should be able to create a type weaver", () => {
    expect(typeFactory).toBeDefined()
  })

  describe("getSilk", () => {
    it("should return a valid GraphQL silk", () => {
      const whereInputSilk = typeFactory.getSilk("UserWhereInput")
      expect(isSilk(whereInputSilk)).toBe(true)
    })

    it("should create silk that delegates to inputType method", () => {
      const whereInputSilk = typeFactory.getSilk("UserWhereInput")
      expect(isSilk(whereInputSilk)).toBe(true)

      const whereInputType = typeFactory.inputType("UserWhereInput")
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
      const createInputSilk = typeFactory.getSilk("UserCreateInput")
      expect(isSilk(createInputSilk)).toBe(true)

      const createInputType = typeFactory.inputType("UserCreateInput")
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
      const UserWhereInput = typeFactory.inputType("UserWhereInput")
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
      const IntFilter = typeFactory.inputType("IntFilter")
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
      const UserCreateInput = typeFactory.inputType("UserCreateInput")
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
      const UserCreateManyInput = typeFactory.inputType("UserCreateManyInput")
      expect(printType(UserCreateManyInput)).toMatchInlineSnapshot(`
        "type UserCreateManyInput {
          id: Int
          email: String!
          name: String
        }"
      `)
    })

    it("should be able to create UpdateManyMutationInput", () => {
      const UserUpdateManyMutationInput = typeFactory.inputType(
        "UserUpdateManyMutationInput"
      )
      expect(printType(UserUpdateManyMutationInput)).toMatchInlineSnapshot(`
        "type UserUpdateManyMutationInput {
          email: StringFieldUpdateOperationsInput
          name: NullableStringFieldUpdateOperationsInput
        }"
      `)
    })

    it("should be able to create WhereInput with custom silk", () => {
      const userResolver = resolver.of(g.User, {
        create: query(g.User.nullable())
          .input({
            data: typeFactory.getSilk("UserCreateInput"),
          })
          .resolve(() => null),
      })

      const Email = new GraphQLScalarType({
        name: "Email",
        description: "Email address",
      })

      const schema = weave(
        ZodWeaver.config({
          presetGraphQLType: (schema) => {
            if (schema instanceof z.ZodEmail) return Email
          },
        }),
        g.User.config({
          fields: { email: z.email() },
        }),
        userResolver
      )

      const UserCreateInput = schema.getType("UserCreateInput")
      expect(printType(UserCreateInput!)).toMatchInlineSnapshot(`
        "input UserCreateInput {
          email: Email!
          name: String
          posts: PostCreateNestedManyWithoutAuthorInput
          publishedPosts: PostCreateNestedManyWithoutPublisherInput
          profile: ProfileCreateNestedOneWithoutUserInput
        }"
      `)
    })
  })

  describe("enumType", () => {
    it("should be able to create enum type", () => {
      const SortOrder = typeFactory.enumType("SortOrder")

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
