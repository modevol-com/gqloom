// Simple in-memory data store
export interface User {
  id: string
  name: string
  email: string
  age?: number
  role: "ADMIN" | "USER" | "GUEST"
}

export interface Post {
  id: string
  title: string
  content: string
  published: boolean
  authorId: string
  createdAt: Date
}

export const users: User[] = [
  {
    id: "1",
    name: "Alice",
    email: "alice@example.com",
    age: 30,
    role: "ADMIN",
  },
  {
    id: "2",
    name: "Bob",
    email: "bob@example.com",
    age: 25,
    role: "USER",
  },
  {
    id: "3",
    name: "Charlie",
    email: "charlie@example.com",
    role: "GUEST",
  },
]

export const posts: Post[] = [
  {
    id: "1",
    title: "Getting Started with Effect Schema",
    content:
      "Effect Schema is a powerful schema validation library for TypeScript...",
    published: true,
    authorId: "1",
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "2",
    title: "GraphQL with GQLoom",
    content:
      "GQLoom makes it easy to build GraphQL APIs with various schema libraries...",
    published: true,
    authorId: "1",
    createdAt: new Date("2024-01-15"),
  },
  {
    id: "3",
    title: "Draft: Advanced Effect Patterns",
    content: "This post is still being written...",
    published: false,
    authorId: "2",
    createdAt: new Date("2024-02-01"),
  },
]

let nextUserId = 4
let nextPostId = 4

export function createUser(input: Omit<User, "id">): User {
  const user: User = {
    id: String(nextUserId++),
    ...input,
  }
  users.push(user)
  return user
}

export function createPost(
  input: Omit<Post, "id" | "published" | "createdAt">
): Post {
  const post: Post = {
    id: String(nextPostId++),
    ...input,
    published: false,
    createdAt: new Date(),
  }
  posts.push(post)
  return post
}
