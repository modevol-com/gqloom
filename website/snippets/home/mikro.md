::: code-group
```ts twoslash [index.ts]
// @filename: entities.ts
import { type EntitySchemaSilk, mikroSilk } from "@gqloom/mikro-orm"
import { type Collection, EntitySchema, type Ref } from "@mikro-orm/core"

export interface IUser {
  id: number
  createdAt: Date
  email: string
  name: string
  role: "admin" | "user"
  posts: Collection<IPost>
}

export interface IPost {
  id: number
  createdAt: Date
  updatedAt: Date
  published: boolean
  title: string
  author: Ref<IUser | null | undefined>
}

export const User: EntitySchemaSilk<EntitySchema<IUser>> = mikroSilk(
  new EntitySchema<IUser>({
    name: "User",
    properties: {
      id: { type: "number", primary: true },
      createdAt: { type: Date, defaultRaw: "now", onCreate: () => new Date() },
      email: { type: "string", unique: true },
      name: { type: "string" },
      role: { type: "string", default: "user" },
      posts: {
        entity: () => Post,
        mappedBy: (post) => post.author,
        kind: "1:m",
      },
    },
  })
)

export const Post: EntitySchemaSilk<EntitySchema<IPost>> = mikroSilk(
  new EntitySchema<IPost>({
    name: "Post",
    properties: {
      id: { type: "number", primary: true },
      createdAt: {
        type: Date,
        defaultRaw: "now",
        onCreate: () => new Date(),
      },
      updatedAt: {
        type: Date,
        defaultRaw: "now",
        onCreate: () => new Date(),
        onUpdate: () => new Date(),
      },
      published: { type: "boolean" },
      title: { type: "string" },
      author: {
        entity: () => User,
        ref: true,
        nullable: true,
        kind: "m:1",
      },
    },
  })
)
// @filename: index.ts
// ---cut---
import { createServer } from "node:http"
import { resolver, weave } from "@gqloom/core"
import { MikroResolverFactory } from "@gqloom/mikro-orm"
import { MikroORM } from "@mikro-orm/postgresql"
import { createYoga } from "graphql-yoga"
import { Post, User } from "./entities"

const ormPromise = MikroORM.init({
  dbName: "gqloom",
  entities: [User, Post],
  clientUrl: process.env.DATABASE_URL!,
})

const userResolverFactory = new MikroResolverFactory(User, () =>
  ormPromise.then((orm) => orm.em.fork())
)

const userResolver = resolver.of(User, {
  user: userResolverFactory.findOneQuery(),
  users: userResolverFactory.findManyQuery(),
  createUser: userResolverFactory.createMutation(),
  updateUser: userResolverFactory.updateMutation(),
  deleteUser: userResolverFactory.deleteOneMutation(),
})

const postResolverFactory = new MikroResolverFactory(Post, () =>
  ormPromise.then((orm) => orm.em.fork())
)

const postResolver = resolver.of(Post, {
  post: postResolverFactory.findOneQuery(),
  posts: postResolverFactory.findManyQuery(),
  createPost: postResolverFactory.createMutation(),
  updatePost: postResolverFactory.updateMutation(),
  deletePost: postResolverFactory.deleteOneMutation(),
})

const schema = weave(userResolver, postResolver)

const yoga = createYoga({ schema })
const server = createServer(yoga)
server.listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql")
})
```

```ts twoslash [entities.ts]
import { type EntitySchemaSilk, mikroSilk } from "@gqloom/mikro-orm"
import { type Collection, EntitySchema, type Ref } from "@mikro-orm/core"

export interface IUser {
  id: number
  createdAt: Date
  email: string
  name: string
  role: "admin" | "user"
  posts: Collection<IPost>
}

export interface IPost {
  id: number
  createdAt: Date
  updatedAt: Date
  published: boolean
  title: string
  author: Ref<IUser | null | undefined>
}

export const User: EntitySchemaSilk<EntitySchema<IUser>> = mikroSilk(
  new EntitySchema<IUser>({
    name: "User",
    properties: {
      id: { type: "number", primary: true },
      createdAt: { type: Date, defaultRaw: "now", onCreate: () => new Date() },
      email: { type: "string", unique: true },
      name: { type: "string" },
      role: { type: "string", default: "user" },
      posts: {
        entity: () => Post,
        mappedBy: (post) => post.author,
        kind: "1:m",
      },
    },
  })
)

export const Post: EntitySchemaSilk<EntitySchema<IPost>> = mikroSilk(
  new EntitySchema<IPost>({
    name: "Post",
    properties: {
      id: { type: "number", primary: true },
      createdAt: {
        type: Date,
        defaultRaw: "now",
        onCreate: () => new Date(),
      },
      updatedAt: {
        type: Date,
        defaultRaw: "now",
        onCreate: () => new Date(),
        onUpdate: () => new Date(),
      },
      published: { type: "boolean" },
      title: { type: "string" },
      author: {
        entity: () => User,
        ref: true,
        nullable: true,
        kind: "m:1",
      },
    },
  })
)
```

```GraphQL [schema.graphql]
type User {
  id: ID!
  createdAt: String!
  email: String!
  name: String!
  role: String!
}

type Post {
  id: ID!
  createdAt: String!
  updatedAt: String!
  published: Boolean!
  title: String!
}

type Query {
  user(id: ID!): User!
  users(where: UserFindManyOptionsWhere, orderBy: UserFindManyOptionsOrderBy, skip: Int, limit: Int): [User!]!
  post(id: ID!): Post!
  posts(where: PostFindManyOptionsWhere, orderBy: PostFindManyOptionsOrderBy, skip: Int, limit: Int): [Post!]!
}

input UserFindManyOptionsWhere {
  id: IDMikroComparisonOperators
  createdAt: StringMikroComparisonOperators
  email: StringMikroComparisonOperators
  name: StringMikroComparisonOperators
  role: StringMikroComparisonOperators
}

input IDMikroComparisonOperators {
  """Equals. Matches values that are equal to a specified value."""
  eq: ID

  """Greater. Matches values that are greater than a specified value."""
  gt: ID

  """
  Greater or Equal. Matches values that are greater than or equal to a specified value.
  """
  gte: ID

  """Contains, Contains, Matches any of the values specified in an array."""
  in: [ID!]

  """Lower, Matches values that are less than a specified value."""
  lt: ID

  """
  Lower or equal, Matches values that are less than or equal to a specified value.
  """
  lte: ID

  """Not equal. Matches all values that are not equal to a specified value."""
  ne: ID

  """Not contains. Matches none of the values specified in an array."""
  nin: [ID!]

  """&&"""
  overlap: [ID!]

  """@>"""
  contains: [ID!]

  """<@"""
  contained: [ID!]
}

input StringMikroComparisonOperators {
  """Equals. Matches values that are equal to a specified value."""
  eq: String

  """Greater. Matches values that are greater than a specified value."""
  gt: String

  """
  Greater or Equal. Matches values that are greater than or equal to a specified value.
  """
  gte: String

  """Contains, Contains, Matches any of the values specified in an array."""
  in: [String!]

  """Lower, Matches values that are less than a specified value."""
  lt: String

  """
  Lower or equal, Matches values that are less than or equal to a specified value.
  """
  lte: String

  """Not equal. Matches all values that are not equal to a specified value."""
  ne: String

  """Not contains. Matches none of the values specified in an array."""
  nin: [String!]

  """&&"""
  overlap: [String!]

  """@>"""
  contains: [String!]

  """<@"""
  contained: [String!]

  """Like. Uses LIKE operator"""
  like: String

  """Regexp. Uses REGEXP operator"""
  re: String

  """Full text.	A driver specific full text search function."""
  fulltext: String

  """ilike"""
  ilike: String
}

input UserFindManyOptionsOrderBy {
  id: MikroQueryOrder
  createdAt: MikroQueryOrder
  email: MikroQueryOrder
  name: MikroQueryOrder
  role: MikroQueryOrder
}

enum MikroQueryOrder {
  ASC
  ASC_NULLS_LAST
  ASC_NULLS_FIRST
  DESC
  DESC_NULLS_LAST
  DESC_NULLS_FIRST
}

input PostFindManyOptionsWhere {
  id: IDMikroComparisonOperators
  createdAt: StringMikroComparisonOperators
  updatedAt: StringMikroComparisonOperators
  published: BooleanMikroComparisonOperators
  title: StringMikroComparisonOperators
}

input BooleanMikroComparisonOperators {
  """Equals. Matches values that are equal to a specified value."""
  eq: Boolean

  """Greater. Matches values that are greater than a specified value."""
  gt: Boolean

  """
  Greater or Equal. Matches values that are greater than or equal to a specified value.
  """
  gte: Boolean

  """Contains, Contains, Matches any of the values specified in an array."""
  in: [Boolean!]

  """Lower, Matches values that are less than a specified value."""
  lt: Boolean

  """
  Lower or equal, Matches values that are less than or equal to a specified value.
  """
  lte: Boolean

  """Not equal. Matches all values that are not equal to a specified value."""
  ne: Boolean

  """Not contains. Matches none of the values specified in an array."""
  nin: [Boolean!]

  """&&"""
  overlap: [Boolean!]

  """@>"""
  contains: [Boolean!]

  """<@"""
  contained: [Boolean!]
}

input PostFindManyOptionsOrderBy {
  id: MikroQueryOrder
  createdAt: MikroQueryOrder
  updatedAt: MikroQueryOrder
  published: MikroQueryOrder
  title: MikroQueryOrder
}

type Mutation {
  createUser(data: UserCreateInput!): User!
  updateUser(data: UserUpdateInput!): User!
  deleteUser(id: ID!): User
  createPost(data: PostCreateInput!): Post!
  updatePost(data: PostUpdateInput!): Post!
  deletePost(id: ID!): Post
}

input UserCreateInput {
  id: ID
  createdAt: String!
  email: String!
  name: String!
  role: String!
}

input UserUpdateInput {
  id: ID!
  createdAt: String
  email: String
  name: String
  role: String
}

input PostCreateInput {
  id: ID
  createdAt: String!
  updatedAt: String!
  published: Boolean!
  title: String!
}

input PostUpdateInput {
  id: ID!
  createdAt: String
  updatedAt: String
  published: Boolean
  title: String
}
```
:::