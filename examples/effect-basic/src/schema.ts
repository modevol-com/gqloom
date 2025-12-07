import { Schema } from "effect"

// User schema
export const User = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  email: Schema.String.annotations({
    asField: { description: "User's email address" },
  }),
  age: Schema.optional(Schema.Number),
  role: Schema.Enums({
    Admin: "ADMIN",
    User: "USER",
    Guest: "GUEST",
  }),
}).annotations({
  title: "User",
  description: "A user in the system",
})

// Post schema
export const Post = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  content: Schema.String.annotations({
    asField: { description: "Post content" },
  }),
  published: Schema.Boolean,
  authorId: Schema.String,
  createdAt: Schema.Date.annotations({ identifier: "Date" }),
}).annotations({
  title: "Post",
  description: "A blog post",
})

// Input schemas
export const CreateUserInput = Schema.Struct({
  name: Schema.String,
  email: Schema.String,
  age: Schema.optional(Schema.Number),
  role: Schema.optional(
    Schema.Enums({
      Admin: "ADMIN",
      User: "USER",
      Guest: "GUEST",
    } as const)
  ),
})

export const CreatePostInput = Schema.Struct({
  title: Schema.String,
  content: Schema.String,
  authorId: Schema.String,
})
