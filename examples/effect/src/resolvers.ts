import { field, mutation, query, resolver, silk } from "@gqloom/core"
import { Schema } from "effect"
import * as db from "./data"
import { CreatePostInput, CreateUserInput, Post, User } from "./schema"

const standard = Schema.standardSchemaV1

// User resolvers
export const userResolver = resolver.of(standard(User), {
  // Query to get all users
  users: query(silk.list(standard(User))).resolve(() => db.users),

  // Query to get a user by ID
  user: query(silk.nullable(standard(User)))
    .input({ id: standard(Schema.String) })
    .resolve(({ id }) => db.users.find((u) => u.id === id) ?? null),

  // Mutation to create a new user
  createUser: mutation(standard(User))
    .input({ input: standard(CreateUserInput) })
    .resolve(({ input }) => {
      return db.createUser({
        name: input.name,
        email: input.email,
        age: input.age,
        role: input.role ?? "USER",
      })
    }),
})

// Post resolvers
export const postResolver = resolver.of(standard(Post), {
  // Query to get all posts
  posts: query(standard(Schema.Array(Post))).resolve(() => db.posts),

  // Query to get published posts
  publishedPosts: query(standard(Schema.Array(Post))).resolve(() =>
    db.posts.filter((p) => p.published)
  ),

  // Query to get a post by ID
  post: query(standard(Schema.NullOr(standard(Post))))
    .input({ id: standard(Schema.String) })
    .resolve(({ id }) => db.posts.find((p) => p.id === id) ?? null),

  // Mutation to create a new post
  createPost: mutation(standard(Post))
    .input({ input: standard(CreatePostInput) })
    .resolve(({ input }) => {
      return db.createPost({
        title: input.title,
        content: input.content,
        authorId: input.authorId,
      })
    }),

  // Mutation to publish a post
  publishPost: mutation(standard(Schema.NullOr(Post)))
    .input({ id: standard(Schema.String) })
    .resolve(({ id }) => {
      const post = db.posts.find((p) => p.id === id)
      if (post) {
        post.published = true
      }
      return post ?? null
    }),

  // Field resolver to get the author of a post
  author: field(standard(Schema.NullOr(User))).resolve(
    (post) => db.users.find((u) => u.id === post.authorId) ?? null
  ),
})

// Simple hello resolver
export const helloResolver = resolver({
  hello: query(standard(Schema.String))
    .input({ name: standard(Schema.NullOr(Schema.String)) })
    .resolve(({ name }) => `Hello, ${name ?? "World"}!`),
})

export const resolvers = [helloResolver, userResolver, postResolver]
