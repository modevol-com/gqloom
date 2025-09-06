import { mikroSilk } from "@gqloom/mikro-orm"
import { type InferEntity, defineEntity } from "@mikro-orm/core"

const UserEntity = defineEntity({
  name: "User",
  properties: (p) => ({
    id: p.integer().primary().autoincrement(),
    createdAt: p.datetime().onCreate(() => new Date()),
    email: p.string(),
    name: p.string(),
    role: p.string().$type<"admin" | "user">().default("user"),
    posts: () => p.oneToMany(PostEntity).mappedBy("author"),
  }),
})
export interface IUser extends InferEntity<typeof UserEntity> {}

const PostEntity = defineEntity({
  name: "Post",
  properties: (p) => ({
    id: p.integer().primary().autoincrement(),
    createdAt: p.datetime().onCreate(() => new Date()),
    updatedAt: p
      .datetime()
      .onCreate(() => new Date())
      .onUpdate(() => new Date()),
    published: p.boolean().default(false),
    title: p.string(),
    content: p.string().lazy(),
    author: () => p.manyToOne(UserEntity),
  }),
})
export interface IPost extends InferEntity<typeof PostEntity> {}

export const User = mikroSilk(UserEntity)
export const Post = mikroSilk(PostEntity)
