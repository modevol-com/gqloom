# Effect Schema Basic Example

This example demonstrates how to use GQLoom with Effect Schema to build a GraphQL API.

## What's Inside

This example shows:

- 🎯 **Effect Schema Integration**: Using `@gqloom/effect` to define GraphQL types with Effect Schema
- 📝 **Type Safety**: Full TypeScript type inference from Effect Schema definitions
- 🔧 **Resolvers**: Queries, mutations, and field resolvers
- 🎨 **Metadata**: Using `asObjectType` and `asField` to configure GraphQL types
- 📊 **Complex Types**: Structs, Enums, Arrays, Optional fields, and Dates

## Features Demonstrated

### Schema Definition

```typescript
import { Schema } from "effect"
import { asObjectType, asField } from "@gqloom/effect"

export const User = asObjectType(
  Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    email: asField(Schema.String, {
      description: "User's email address",
    }),
    age: Schema.optional(Schema.Number),
    role: Schema.Enums({
      Admin: "ADMIN",
      User: "USER",
      Guest: "GUEST",
    }),
  }),
  {
    description: "A user in the system",
  }
)
```

### Resolvers

```typescript
import { query, mutation, resolver, field } from "@gqloom/core"

export const userResolver = resolver.of(User, {
  users: query(Schema.Array(User)).resolve(() => db.users),

  user: query(Schema.NullOr(User))
    .input({ id: Schema.String })
    .resolve(({ id }) => db.users.find((u) => u.id === id) ?? null),

  createUser: mutation(User)
    .input({ input: CreateUserInput })
    .resolve(({ input }) => db.createUser(input)),

  posts: field(Schema.Array(Post))
    .resolve((user) => db.posts.filter((p) => p.authorId === user.id)),
})
```

## Running the Example

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

The server will start at `http://localhost:4000/graphql`

## Example Queries

### Query All Users

```graphql
query {
  users {
    id
    name
    email
    age
    role
    posts {
      id
      title
      published
    }
  }
}
```

### Create a User

```graphql
mutation {
  createUser(input: {
    name: "Dave"
    email: "dave@example.com"
    age: 28
    role: USER
  }) {
    id
    name
    email
  }
}
```

### Query Posts with Authors

```graphql
query {
  posts {
    id
    title
    content
    published
    createdAt
    author {
      id
      name
      email
    }
  }
}
```

### Create and Publish a Post

```graphql
mutation {
  createPost(input: {
    title: "My New Post"
    content: "This is the content of my post"
    authorId: "1"
  }) {
    id
    title
    published
  }
}

mutation {
  publishPost(id: "4") {
    id
    title
    published
  }
}
```

## Learn More

- [Effect Schema Documentation](https://effect.website/docs/schema/introduction)
- [GQLoom Documentation](https://gqloom.dev)
- [GQLoom Effect Package](../../packages/effect/README.md)
