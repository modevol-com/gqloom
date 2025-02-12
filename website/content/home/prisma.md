
```ts title="src/index.ts" tab="index.ts"
import { createServer } from "node:http"
import { weave } from "@gqloom/core"
import { PrismaResolverFactory } from "@gqloom/prisma"
import { createYoga } from "graphql-yoga"
import { PrismaClient } from "./generated/client"
import { Post, User } from "./generated/gqloom"

const db = new PrismaClient()

const userResolver = new PrismaResolverFactory(User, db).resolver()
const postResolver = new PrismaResolverFactory(Post, db).resolver()

const schema = weave(userResolver, postResolver)

const yoga = createYoga({ schema })
const server = createServer(yoga)
server.listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})
```

```prisma title="prisma/schema.prisma" tab="schema.prisma"
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
  output = "../src/generated/client"
}

generator gqloom {
  provider = "prisma-gqloom"
  output   = "../src/generated/gqloom"
}

model User {
  id        Int      @id @default(autoincrement())
  createdAt DateTime @default(now())
  email     String   @unique
  name      String?
  role      Role     @default(USER)
  posts     Post[]
}

model Post {
  id        Int      @id @default(autoincrement())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  published Boolean  @default(false)
  title     String   @db.VarChar(255)
  author    User?    @relation(fields: [authorId], references: [id])
  authorId  Int?
}

enum Role {
  USER
  ADMIN
}
```

```graphql title="schema.graphql" tab="schema.graphql"
type User {
  id: ID!
  createdAt: String!
  email: String!
  name: String
  role: Role!
  posts: [Post!]!
}

enum Role {
  USER
  ADMIN
}

type Post {
  id: ID!
  createdAt: String!
  updatedAt: String!
  published: Boolean!
  title: String!
  authorId: Int
  author: User
}

type Query {
  countUser(where: UserWhereInput, orderBy: [UserOrderByWithRelationInput!], cursor: UserWhereUniqueInput, skip: Int, take: Int): Int!
  findFirstUser(where: UserWhereInput, orderBy: [UserOrderByWithRelationInput!], cursor: UserWhereUniqueInput, skip: Int, take: Int, distinct: [UserScalarFieldEnum!]): User
  findManyUser(where: UserWhereInput, orderBy: [UserOrderByWithRelationInput!], cursor: UserWhereUniqueInput, skip: Int, take: Int, distinct: [UserScalarFieldEnum!]): [User!]!
  findUniqueUser(where: UserWhereUniqueInput): User
  countPost(where: PostWhereInput, orderBy: [PostOrderByWithRelationInput!], cursor: PostWhereUniqueInput, skip: Int, take: Int): Int!
  findFirstPost(where: PostWhereInput, orderBy: [PostOrderByWithRelationInput!], cursor: PostWhereUniqueInput, skip: Int, take: Int, distinct: [PostScalarFieldEnum!]): Post
  findManyPost(where: PostWhereInput, orderBy: [PostOrderByWithRelationInput!], cursor: PostWhereUniqueInput, skip: Int, take: Int, distinct: [PostScalarFieldEnum!]): [Post!]!
  findUniquePost(where: PostWhereUniqueInput): Post
}

input UserWhereInput {
  AND: [UserWhereInput!]
  OR: [UserWhereInput!]
  NOT: [UserWhereInput!]
  id: IntFilter
  createdAt: DateTimeFilter
  email: StringFilter
  name: StringNullableFilter
  role: EnumRoleFilter
  posts: PostListRelationFilter
}

input IntFilter {
  equals: Int
  in: [Int!]
  notIn: [Int!]
  lt: Int
  lte: Int
  gt: Int
  gte: Int
  not: NestedIntFilter
}

input NestedIntFilter {
  equals: Int
  in: [Int!]
  notIn: [Int!]
  lt: Int
  lte: Int
  gt: Int
  gte: Int
  not: NestedIntFilter
}

input DateTimeFilter {
  equals: String
  in: [String!]
  notIn: [String!]
  lt: String
  lte: String
  gt: String
  gte: String
  not: NestedDateTimeFilter
}

input NestedDateTimeFilter {
  equals: String
  in: [String!]
  notIn: [String!]
  lt: String
  lte: String
  gt: String
  gte: String
  not: NestedDateTimeFilter
}

input StringFilter {
  equals: String
  in: [String!]
  notIn: [String!]
  lt: String
  lte: String
  gt: String
  gte: String
  contains: String
  startsWith: String
  endsWith: String
  mode: QueryMode
  not: NestedStringFilter
}

enum QueryMode {
  default
  insensitive
}

input NestedStringFilter {
  equals: String
  in: [String!]
  notIn: [String!]
  lt: String
  lte: String
  gt: String
  gte: String
  contains: String
  startsWith: String
  endsWith: String
  not: NestedStringFilter
}

input StringNullableFilter {
  equals: String
  in: [String!]
  notIn: [String!]
  lt: String
  lte: String
  gt: String
  gte: String
  contains: String
  startsWith: String
  endsWith: String
  mode: QueryMode
  not: NestedStringNullableFilter
}

input NestedStringNullableFilter {
  equals: String
  in: [String!]
  notIn: [String!]
  lt: String
  lte: String
  gt: String
  gte: String
  contains: String
  startsWith: String
  endsWith: String
  not: NestedStringNullableFilter
}

input EnumRoleFilter {
  equals: Role
  in: [Role!]
  notIn: [Role!]
  not: NestedEnumRoleFilter
}

input NestedEnumRoleFilter {
  equals: Role
  in: [Role!]
  notIn: [Role!]
  not: NestedEnumRoleFilter
}

input PostListRelationFilter {
  every: PostWhereInput
  some: PostWhereInput
  none: PostWhereInput
}

input PostWhereInput {
  AND: [PostWhereInput!]
  OR: [PostWhereInput!]
  NOT: [PostWhereInput!]
  id: IntFilter
  createdAt: DateTimeFilter
  updatedAt: DateTimeFilter
  published: BoolFilter
  title: StringFilter
  authorId: IntNullableFilter
  author: UserNullableRelationFilter
}

input BoolFilter {
  equals: Boolean
  not: NestedBoolFilter
}

input NestedBoolFilter {
  equals: Boolean
  not: NestedBoolFilter
}

input IntNullableFilter {
  equals: Int
  in: [Int!]
  notIn: [Int!]
  lt: Int
  lte: Int
  gt: Int
  gte: Int
  not: NestedIntNullableFilter
}

input NestedIntNullableFilter {
  equals: Int
  in: [Int!]
  notIn: [Int!]
  lt: Int
  lte: Int
  gt: Int
  gte: Int
  not: NestedIntNullableFilter
}

input UserNullableRelationFilter {
  is: UserWhereInput
  isNot: UserWhereInput
}

input UserOrderByWithRelationInput {
  id: SortOrder
  createdAt: SortOrder
  email: SortOrder
  name: SortOrderInput
  role: SortOrder
  posts: PostOrderByRelationAggregateInput
}

enum SortOrder {
  asc
  desc
}

input SortOrderInput {
  sort: SortOrder!
  nulls: NullsOrder
}

enum NullsOrder {
  first
  last
}

input PostOrderByRelationAggregateInput {
  _count: SortOrder
}

input UserWhereUniqueInput {
  id: Int
  email: String
  AND: [UserWhereInput!]
  OR: [UserWhereInput!]
  NOT: [UserWhereInput!]
  createdAt: DateTimeFilter
  name: StringNullableFilter
  role: EnumRoleFilter
  posts: PostListRelationFilter
}

enum UserScalarFieldEnum {
  id
  createdAt
  email
  name
  role
}

input PostOrderByWithRelationInput {
  id: SortOrder
  createdAt: SortOrder
  updatedAt: SortOrder
  published: SortOrder
  title: SortOrder
  authorId: SortOrderInput
  author: UserOrderByWithRelationInput
}

input PostWhereUniqueInput {
  id: Int
  AND: [PostWhereInput!]
  OR: [PostWhereInput!]
  NOT: [PostWhereInput!]
  createdAt: DateTimeFilter
  updatedAt: DateTimeFilter
  published: BoolFilter
  title: StringFilter
  authorId: IntNullableFilter
  author: UserNullableRelationFilter
}

enum PostScalarFieldEnum {
  id
  createdAt
  updatedAt
  published
  title
  authorId
}

type Mutation {
  createUser(data: UserCreateInput!): User
  createManyUser(data: [UserCreateManyInput!]!): BatchPayload
  deleteUser(where: UserWhereUniqueInput!): User
  deleteManyUser(where: UserWhereInput): BatchPayload
  updateUser(data: UserUpdateInput!, where: UserWhereUniqueInput!): User!
  updateManyUser(data: UserUpdateManyMutationInput!, where: UserWhereInput): BatchPayload
  upsertUser(where: UserWhereUniqueInput!, create: UserCreateInput!, update: UserUpdateInput!): User!
  createPost(data: PostCreateInput!): Post
  createManyPost(data: [PostCreateManyInput!]!): BatchPayload
  deletePost(where: PostWhereUniqueInput!): Post
  deleteManyPost(where: PostWhereInput): BatchPayload
  updatePost(data: PostUpdateInput!, where: PostWhereUniqueInput!): Post!
  updateManyPost(data: PostUpdateManyMutationInput!, where: PostWhereInput): BatchPayload
  upsertPost(where: PostWhereUniqueInput!, create: PostCreateInput!, update: PostUpdateInput!): Post!
}

input UserCreateInput {
  createdAt: String
  email: String!
  name: String
  role: Role
  posts: PostCreateNestedManyWithoutAuthorInput
}

input PostCreateNestedManyWithoutAuthorInput {
  create: [PostCreateWithoutAuthorInput!]
  connectOrCreate: [PostCreateOrConnectWithoutAuthorInput!]
  createMany: PostCreateManyAuthorInputEnvelope
  connect: [PostWhereUniqueInput!]
}

input PostCreateWithoutAuthorInput {
  createdAt: String
  updatedAt: String
  published: Boolean
  title: String!
}

input PostCreateOrConnectWithoutAuthorInput {
  where: PostWhereUniqueInput!
  create: PostCreateWithoutAuthorInput!
}

input PostCreateManyAuthorInputEnvelope {
  data: [PostCreateManyAuthorInput!]!
  skipDuplicates: Boolean
}

input PostCreateManyAuthorInput {
  id: Int
  createdAt: String
  updatedAt: String
  published: Boolean
  title: String!
}

type BatchPayload {
  count: Int!
}

input UserCreateManyInput {
  id: Int
  createdAt: String
  email: String!
  name: String
  role: Role
}

input UserUpdateInput {
  createdAt: DateTimeFieldUpdateOperationsInput
  email: StringFieldUpdateOperationsInput
  name: NullableStringFieldUpdateOperationsInput
  role: EnumRoleFieldUpdateOperationsInput
  posts: PostUpdateManyWithoutAuthorNestedInput
}

input DateTimeFieldUpdateOperationsInput {
  set: String
}

input StringFieldUpdateOperationsInput {
  set: String
}

input NullableStringFieldUpdateOperationsInput {
  set: String
}

input EnumRoleFieldUpdateOperationsInput {
  set: Role
}

input PostUpdateManyWithoutAuthorNestedInput {
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
}

input PostUpsertWithWhereUniqueWithoutAuthorInput {
  where: PostWhereUniqueInput!
  update: PostUpdateWithoutAuthorInput!
  create: PostCreateWithoutAuthorInput!
}

input PostUpdateWithoutAuthorInput {
  createdAt: DateTimeFieldUpdateOperationsInput
  updatedAt: DateTimeFieldUpdateOperationsInput
  published: BoolFieldUpdateOperationsInput
  title: StringFieldUpdateOperationsInput
}

input BoolFieldUpdateOperationsInput {
  set: Boolean
}

input PostUpdateWithWhereUniqueWithoutAuthorInput {
  where: PostWhereUniqueInput!
  data: PostUpdateWithoutAuthorInput!
}

input PostUpdateManyWithWhereWithoutAuthorInput {
  where: PostScalarWhereInput!
  data: PostUpdateManyMutationInput!
}

input PostScalarWhereInput {
  AND: [PostScalarWhereInput!]
  OR: [PostScalarWhereInput!]
  NOT: [PostScalarWhereInput!]
  id: IntFilter
  createdAt: DateTimeFilter
  updatedAt: DateTimeFilter
  published: BoolFilter
  title: StringFilter
  authorId: IntNullableFilter
}

input PostUpdateManyMutationInput {
  createdAt: DateTimeFieldUpdateOperationsInput
  updatedAt: DateTimeFieldUpdateOperationsInput
  published: BoolFieldUpdateOperationsInput
  title: StringFieldUpdateOperationsInput
}

input UserUpdateManyMutationInput {
  createdAt: DateTimeFieldUpdateOperationsInput
  email: StringFieldUpdateOperationsInput
  name: NullableStringFieldUpdateOperationsInput
  role: EnumRoleFieldUpdateOperationsInput
}

input PostCreateInput {
  createdAt: String
  updatedAt: String
  published: Boolean
  title: String!
  author: UserCreateNestedOneWithoutPostsInput
}

input UserCreateNestedOneWithoutPostsInput {
  create: UserCreateWithoutPostsInput
  connectOrCreate: UserCreateOrConnectWithoutPostsInput
  connect: UserWhereUniqueInput
}

input UserCreateWithoutPostsInput {
  createdAt: String
  email: String!
  name: String
  role: Role
}

input UserCreateOrConnectWithoutPostsInput {
  where: UserWhereUniqueInput!
  create: UserCreateWithoutPostsInput!
}

input PostCreateManyInput {
  id: Int
  createdAt: String
  updatedAt: String
  published: Boolean
  title: String!
  authorId: Int
}

input PostUpdateInput {
  createdAt: DateTimeFieldUpdateOperationsInput
  updatedAt: DateTimeFieldUpdateOperationsInput
  published: BoolFieldUpdateOperationsInput
  title: StringFieldUpdateOperationsInput
  author: UserUpdateOneWithoutPostsNestedInput
}

input UserUpdateOneWithoutPostsNestedInput {
  create: UserCreateWithoutPostsInput
  connectOrCreate: UserCreateOrConnectWithoutPostsInput
  upsert: UserUpsertWithoutPostsInput
  disconnect: UserWhereInput
  delete: UserWhereInput
  connect: UserWhereUniqueInput
  update: UserUpdateToOneWithWhereWithoutPostsInput
}

input UserUpsertWithoutPostsInput {
  update: UserUpdateWithoutPostsInput!
  create: UserCreateWithoutPostsInput!
  where: UserWhereInput
}

input UserUpdateWithoutPostsInput {
  createdAt: DateTimeFieldUpdateOperationsInput
  email: StringFieldUpdateOperationsInput
  name: NullableStringFieldUpdateOperationsInput
  role: EnumRoleFieldUpdateOperationsInput
}

input UserUpdateToOneWithWhereWithoutPostsInput {
  where: UserWhereInput
  data: UserUpdateWithoutPostsInput!
}
```