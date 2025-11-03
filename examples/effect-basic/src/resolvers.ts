import { field, mutation, query, resolver } from "@gqloom/core"
import { Schema } from "effect"
import * as db from "./data"
import { CreatePostInput, CreateUserInput, Post, User } from "./schema"

// User resolvers
export const userResolver = resolver.of(User, {
  // Query to get all users
  users: query(Schema.Array(User)).resolve(() => db.users),

  // Query to get a user by ID
  user: query(Schema.NullOr(User))
    .input({ id: Schema.String })
    .resolve(({ id }) => db.users.find((u) => u.id === id) ?? null),

  // Mutation to create a new user
  createUser: mutation(User)
    .input({ input: CreateUserInput })
    .resolve(({ input }) => {
      return db.createUser({
        name: input.name,
        email: input.email,
        age: input.age,
        role: input.role ?? "USER",
      })
    }),

  // Field resolver to get posts by user
  posts: field(Schema.Array(Post)).resolve((user) =>
    db.posts.filter((p) => p.authorId === user.id)
  ),
})

// Post resolvers
export const postResolver = resolver.of(Post, {
  // Query to get all posts
  posts: query(Schema.Array(Post)).resolve(() => db.posts),

  // Query to get published posts
  publishedPosts: query(Schema.Array(Post)).resolve(() =>
    db.posts.filter((p) => p.published)
  ),

  // Query to get a post by ID
  post: query(Schema.NullOr(Post))
    .input({ id: Schema.String })
    .resolve(({ id }) => db.posts.find((p) => p.id === id) ?? null),

  // Mutation to create a new post
  createPost: mutation(Post)
    .input({ input: CreatePostInput })
    .resolve(({ input }) => {
      return db.createPost({
        title: input.title,
        content: input.content,
        authorId: input.authorId,
      })
    }),

  // Mutation to publish a post
  publishPost: mutation(Schema.NullOr(Post))
    .input({ id: Schema.String })
    .resolve(({ id }) => {
      const post = db.posts.find((p) => p.id === id)
      if (post) {
        post.published = true
      }
      return post ?? null
    }),

  // Field resolver to get the author of a post
  author: field(Schema.NullOr(User)).resolve(
    (post) => db.users.find((u) => u.id === post.authorId) ?? null
  ),
})

// Simple hello resolver
export const helloResolver = resolver({
  hello: query(Schema.String)
    .input({ name: Schema.NullOr(Schema.String) })
    .resolve(({ name }) => `Hello, ${name ?? "World"}!`),
})

export const resolvers = [helloResolver, userResolver, postResolver]
