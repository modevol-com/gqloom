import { describe, it, expect } from "vitest"
import * as g from "./generated"
import { PrismaModelTypeBuilder } from "../src"
import {
  printType,
  GraphQLInt,
  GraphQLString,
  GraphQLID,
  GraphQLFloat,
} from "graphql"

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
        publishedPosts: PostListRelationFilter
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
          email: String
          name: StringFilter
          posts: PostListRelationFilter
          publishedPosts: PostListRelationFilter
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
        height: FloatFilter
        weight: IntFilter
        birthDate: StringFilter
        fullName: DogFullNameInput
      }"
    `)
  })

  it("should be able to create orderByWithRelationInput", () => {
    const UserTypeBuilder = new PrismaModelTypeBuilder(g.User)
    expect(printType(UserTypeBuilder.orderByWithRelationInput()))
      .toMatchInlineSnapshot(`
        "type UserOrderByWithRelationInput {
          id: SortOrder
          email: SortOrder
          name: SortOrder
          posts: PostOrderByRelationAggregateInput
          publishedPosts: PostOrderByRelationAggregateInput
          Profile: ProfileOrderByWithRelationInput
        }"
      `)
  })

  it("should be able to create orderByRelationAggregateInput", () => {
    const PostTypeBuilder = new PrismaModelTypeBuilder(g.Post)
    expect(printType(PostTypeBuilder.orderByRelationAggregateInput()))
      .toMatchInlineSnapshot(`
      "type PostOrderByRelationAggregateInput {
        _count: SortOrder
      }"
    `)
  })

  it("should be able to create countArgs", () => {
    const UserTypeBuilder = new PrismaModelTypeBuilder(g.User)
    expect(printType(UserTypeBuilder.countArgs())).toMatchInlineSnapshot(`
      "type UserCountQueryInput {
        where: UserWhereInput
        orderBy: UserOrderByWithRelationInput
        cursor: UserWhereUniqueInput
        skip: Int
        take: Int
      }"
    `)
  })

  it("should be able to create scalarFieldEnum", () => {
    const UserTypeBuilder = new PrismaModelTypeBuilder(g.User)
    expect(printType(UserTypeBuilder.scalarFieldEnum())).toMatchInlineSnapshot(`
      "enum UserScalarFieldEnum {
        id
        email
        name
      }"
    `)

    const CatTypeBuilder = new PrismaModelTypeBuilder(g.Cat)
    expect(printType(CatTypeBuilder.scalarFieldEnum())).toMatchInlineSnapshot(`
      "enum CatScalarFieldEnum {
        firstName
        lastName
      }"
    `)
  })

  it("should be able to create findFirstArgs", () => {
    const UserTypeBuilder = new PrismaModelTypeBuilder(g.User)
    expect(printType(UserTypeBuilder.findFirstArgs())).toMatchInlineSnapshot(`
      "type UserFindFirstArgs {
        where: UserWhereInput
        orderBy: UserOrderByWithRelationInput
        cursor: UserWhereUniqueInput
        skip: Int
        take: Int
        distinct: [UserScalarFieldEnum!]
      }"
    `)
  })

  it("should be able to create findManyArgs", () => {
    const UserTypeBuilder = new PrismaModelTypeBuilder(g.User)
    expect(printType(UserTypeBuilder.findManyArgs())).toMatchInlineSnapshot(`
      "type UserFindManyArgs {
        where: UserWhereInput
        orderBy: UserOrderByWithRelationInput
        cursor: UserWhereUniqueInput
        skip: Int
        take: Int
        distinct: [UserScalarFieldEnum!]
      }"
    `)
  })

  it("should be able to create findUniqueArgs", () => {
    const UserTypeBuilder = new PrismaModelTypeBuilder(g.User)
    expect(printType(UserTypeBuilder.findUniqueArgs())).toMatchInlineSnapshot(`
      "type UserFindUniqueArgs {
        where: UserWhereUniqueInput!
      }"
    `)
  })

  it("should be able to create createInput", () => {
    const UserTypeBuilder = new PrismaModelTypeBuilder(g.User)
    expect(printType(UserTypeBuilder.createInput())).toMatchInlineSnapshot(`
      "type UserCreateInput {
        id: ID
        email: String!
        name: String
        posts: PostCreateNestedManyWithoutAuthorInput
        publishedPosts: PostCreateNestedManyWithoutPublishedByInput
        Profile: ProfileCreateNestedOneWithoutUserInput
      }"
    `)

    const PostTypeBuilder = new PrismaModelTypeBuilder(g.Post)
    expect(printType(PostTypeBuilder.createInput())).toMatchInlineSnapshot(`
      "type PostCreateInput {
        id: ID
        title: String!
        content: String
        published: Boolean
        authorId: Int!
        publishedById: Int
        author: UserCreateNestedOneWithoutPostsInput
        publishedBy: UserCreateNestedOneWithoutPublishedPostsInput
        categories: CategoryCreateNestedManyWithoutPostsInput
      }"
    `)

    expect(printType(PostTypeBuilder.createInput({ without: "author" })))
      .toMatchInlineSnapshot(`
      "type PostCreateWithoutAuthorInput {
        id: ID
        title: String!
        content: String
        published: Boolean
        publishedById: Int
        publishedBy: UserCreateNestedOneWithoutPublishedPostsInput
        categories: CategoryCreateNestedManyWithoutPostsInput
      }"
    `)

    expect(printType(PostTypeBuilder.createInput({ without: "publishedBy" })))
      .toMatchInlineSnapshot(`
      "type PostCreateWithoutPublishedByInput {
        id: ID
        title: String!
        content: String
        published: Boolean
        authorId: Int!
        author: UserCreateNestedOneWithoutPostsInput
        categories: CategoryCreateNestedManyWithoutPostsInput
      }"
    `)
  })

  it("should be able to create createArgs", () => {
    const UserTypeBuilder = new PrismaModelTypeBuilder(g.User)
    expect(printType(UserTypeBuilder.createArgs())).toMatchInlineSnapshot(`
      "type UserCreateArgs {
        data: UserCreateInput!
      }"
    `)
  })

  it("should be able to create createManyInput", () => {
    const UserTypeBuilder = new PrismaModelTypeBuilder(g.User)
    expect(printType(UserTypeBuilder.createManyInput())).toMatchInlineSnapshot(`
      "type UserCreateManyInput {
        id: ID
        email: String!
        name: String
      }"
    `)
  })

  it("should be able to create createManyArgs", () => {
    const UserTypeBuilder = new PrismaModelTypeBuilder(g.User)
    expect(printType(UserTypeBuilder.createManyArgs())).toMatchInlineSnapshot(`
      "type UserCreateManyArgs {
        data: [UserCreateManyInput!]!
      }"
    `)
  })

  it("should be able to create deleteArgs", () => {
    const UserTypeBuilder = new PrismaModelTypeBuilder(g.User)
    expect(printType(UserTypeBuilder.deleteArgs())).toMatchInlineSnapshot(`
      "type UserDeleteArgs {
        where: UserWhereUniqueInput!
      }"
    `)
  })

  it("should be able to create deleteManyArgs", () => {
    const UserTypeBuilder = new PrismaModelTypeBuilder(g.User)
    expect(printType(UserTypeBuilder.deleteManyArgs())).toMatchInlineSnapshot(`
      "type UserDeleteManyArgs {
        where: UserWhereInput
      }"
    `)
  })

  it("should be able to create fieldUpdateOperationsInput", () => {
    expect(
      printType(PrismaModelTypeBuilder.fieldUpdateOperationsInput(GraphQLInt))
    ).toMatchInlineSnapshot(`
      "type IntFieldUpdateOperationsInput {
        set: Int
        increment: Int
        decrement: Int
        multiply: Float
        divide: Float
      }"
    `)

    expect(
      printType(PrismaModelTypeBuilder.fieldUpdateOperationsInput(GraphQLFloat))
    ).toMatchInlineSnapshot(`
      "type FloatFieldUpdateOperationsInput {
        set: Float
        increment: Float
        decrement: Float
        multiply: Float
        divide: Float
      }"
    `)

    expect(
      printType(PrismaModelTypeBuilder.fieldUpdateOperationsInput(GraphQLID))
    ).toMatchInlineSnapshot(`
      "type IDFieldUpdateOperationsInput {
        set: ID
      }"
    `)

    expect(
      printType(
        PrismaModelTypeBuilder.fieldUpdateOperationsInput(GraphQLString)
      )
    ).toMatchInlineSnapshot(`
      "type StringFieldUpdateOperationsInput {
        set: String
      }"
    `)
  })

  it("should be able to create updateInput", () => {
    const UserTypeBuilder = new PrismaModelTypeBuilder(g.User)
    expect(printType(UserTypeBuilder.updateInput())).toMatchInlineSnapshot(`
      "type UserUpdateInput {
        email: StringFieldUpdateOperationsInput
        name: StringFieldUpdateOperationsInput
        posts: PostUpdateManyWithoutAuthorNestedInput
        publishedPosts: PostUpdateManyWithoutPublishedByNestedInput
        Profile: ProfileUpdateOneWithoutUserNestedInput
      }"
    `)

    const DogTypeBuilder = new PrismaModelTypeBuilder(g.Dog)
    expect(printType(DogTypeBuilder.updateInput())).toMatchInlineSnapshot(`
      "type DogUpdateInput {
        firstName: StringFieldUpdateOperationsInput
        lastName: StringFieldUpdateOperationsInput
        height: FloatFieldUpdateOperationsInput
        weight: IntFieldUpdateOperationsInput
        birthDate: StringFieldUpdateOperationsInput
      }"
    `)

    const PostTypeBuilder = new PrismaModelTypeBuilder(g.Post)

    expect(printType(PostTypeBuilder.updateInput())).toMatchInlineSnapshot(`
      "type PostUpdateInput {
        title: StringFieldUpdateOperationsInput
        content: StringFieldUpdateOperationsInput
        published: BooleanFieldUpdateOperationsInput
        author: UserUpdateOneRequiredWithoutPostsNestedInput
        publishedBy: UserUpdateOneWithoutPublishedPostsNestedInput
        categories: CategoryUpdateManyWithoutPostsNestedInput
      }"
    `)
  })

  it("should be able to create updateNestedInput", () => {
    const UserTypeBuilder = new PrismaModelTypeBuilder(g.User)

    expect(
      printType(
        UserTypeBuilder.updateNestedInput({ from: "posts", required: true })
      )
    ).toMatchInlineSnapshot(`
      "type UserUpdateOneRequiredWithoutPostsNestedInput {
        create: UserCreateWithoutPostsInput
        connectOrCreate: UserCreateOrConnectWithoutPostsInput
        upsert: UserUpsertWithoutPostsInput
        connect: UserWhereUniqueInput
        update: UserUpdateToOneWithWhereWithoutPostsInput
      }"
    `)

    expect(
      printType(UserTypeBuilder.updateNestedInput({ from: "publishedPosts" }))
    ).toMatchInlineSnapshot(`
      "type UserUpdateOneWithoutPublishedPostsNestedInput {
        create: UserCreateWithoutPublishedPostsInput
        connectOrCreate: UserCreateOrConnectWithoutPublishedPostsInput
        upsert: UserUpsertWithoutPublishedPostsInput
        disconnect: UserWhereInput
        delete: UserWhereInput
        connect: UserWhereUniqueInput
        update: UserUpdateToOneWithWhereWithoutPublishedPostsInput
      }"
    `)

    const CategoryTypeBuilder = new PrismaModelTypeBuilder(g.Category)

    expect(
      printType(
        CategoryTypeBuilder.updateNestedInput({ from: "posts", many: true })
      )
    ).toMatchInlineSnapshot(`
      "type CategoryUpdateManyWithoutPostsNestedInput {
        create: [CategoryCreateWithoutPostsInput!]
        connectOrCreate: [CategoryCreateOrConnectWithoutPostsInput!]
        upsert: [CategoryUpsertWithWhereUniqueWithoutPostsInput!]
        set: [CategoryWhereUniqueInput!]
        disconnect: [CategoryWhereUniqueInput!]
        delete: [CategoryWhereUniqueInput!]
        connect: [CategoryWhereUniqueInput!]
        update: [CategoryUpdateWithWhereUniqueWithoutPostsInput!]
        updateMany: [CategoryUpdateManyWithWhereWithoutPostsInput!]
        deleteMany: [CategoryScalarWhereInput!]
      }"
    `)

    const PostTypeBuilder = new PrismaModelTypeBuilder(g.Post)

    expect(
      printType(
        PostTypeBuilder.updateNestedInput({ from: "author", many: true })
      )
    ).toMatchInlineSnapshot(`
      "type PostUpdateManyWithoutAuthorNestedInput {
        create: [PostCreateWithoutAuthorInput!]
        connectOrCreate: [PostCreateOrConnectWithoutAuthorInput!]
        upsert: [PostUpsertWithWhereUniqueWithoutAuthorInput!]
        createMany: PostCreateManyAuthorInputEnvelope
        set: [PostWhereUniqueInput!]
        disconnect: [PostWhereUniqueInput!]
        delete: [PostWhereUniqueInput!]
        connect: [PostWhereUniqueInput!]
        update: [PostUpdateWithWhereUniqueWithoutAuthorInput!]
        updateMany: [PostUpdateManyWithWhereWithoutAuthorInput!]
        deleteMany: [PostScalarWhereInput!]
      }"
    `)

    expect(
      printType(
        PostTypeBuilder.updateNestedInput({
          from: "publishedBy",
          many: true,
        })
      )
    ).toMatchInlineSnapshot(`
      "type PostUpdateManyWithoutPublishedByNestedInput {
        create: [PostCreateWithoutPublishedByInput!]
        connectOrCreate: [PostCreateOrConnectWithoutPublishedByInput!]
        upsert: [PostUpsertWithWhereUniqueWithoutPublishedByInput!]
        createMany: PostCreateManyPublishedByInputEnvelope
        set: [PostWhereUniqueInput!]
        disconnect: [PostWhereUniqueInput!]
        delete: [PostWhereUniqueInput!]
        connect: [PostWhereUniqueInput!]
        update: [PostUpdateWithWhereUniqueWithoutPublishedByInput!]
        updateMany: [PostUpdateManyWithWhereWithoutPublishedByInput!]
        deleteMany: [PostScalarWhereInput!]
      }"
    `)

    const Profile = new PrismaModelTypeBuilder(g.Profile)

    expect(printType(Profile.updateNestedInput({ from: "user" })))
      .toMatchInlineSnapshot(`
      "type ProfileUpdateOneWithoutUserNestedInput {
        create: ProfileCreateWithoutUserInput
        connectOrCreate: ProfileCreateOrConnectWithoutUserInput
        upsert: ProfileUpsertWithoutUserInput
        disconnect: ProfileWhereInput
        delete: ProfileWhereInput
        connect: ProfileWhereUniqueInput
        update: ProfileUpdateToOneWithWhereWithoutUserInput
      }"
    `)
  })

  it("should be able to create connectOrCreateInput", () => {
    const PostTypeBuilder = new PrismaModelTypeBuilder(g.Post)
    expect(
      printType(PostTypeBuilder.connectOrCreateInput({ without: "author" }))
    ).toMatchInlineSnapshot(`
      "type PostCreateOrConnectWithoutAuthorInput {
        where: PostWhereUniqueInput!
        create: PostCreateWithoutAuthorInput!
      }"
    `)

    expect(
      printType(
        PostTypeBuilder.connectOrCreateInput({ without: "publishedBy" })
      )
    ).toMatchInlineSnapshot(`
      "type PostCreateOrConnectWithoutPublishedByInput {
        where: PostWhereUniqueInput!
        create: PostCreateWithoutPublishedByInput!
      }"
    `)
  })
})
