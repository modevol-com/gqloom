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
