import { asField, asObjectType } from "@gqloom/effect"
import { Schema } from "effect"

// User schema
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

// Post schema
export const Post = asObjectType(
  Schema.Struct({
    id: Schema.String,
    title: Schema.String,
    content: asField(Schema.String, {
      description: "Post content",
    }),
    published: Schema.Boolean,
    authorId: Schema.String,
    createdAt: Schema.Date.annotations({ identifier: "Date" }),
  }),
  {
    description: "A blog post",
  }
)

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
    })
  ),
})

export const CreatePostInput = Schema.Struct({
  title: Schema.String,
  content: Schema.String,
  authorId: Schema.String,
})
