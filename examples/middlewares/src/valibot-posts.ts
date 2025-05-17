import { mutation, resolver } from "@gqloom/core"
import * as v from "valibot"
import { useUser } from "./context"

const Post = v.object({
  __typename: v.nullish(v.literal("Post")),
  id: v.number(),
  title: v.string(),
  content: v.string(),
  authorId: v.number(),
})

interface IPost extends v.InferOutput<typeof Post> {}

const posts: IPost[] = []

export const postsResolver = resolver({
  createPost: mutation(Post)
    .input(
      v.object({
        title: v.string(),
        content: v.string(),
        authorId: v.number(),
      })
    )
    .use(async ({ next, parseInput }) => {
      const inputResult = await parseInput.getResult()
      inputResult.authorId = (await useUser()).id
      parseInput.result = { value: inputResult }
      return next()
    })
    .resolve(({ title, content, authorId }) => {
      const post = {
        id: Math.random(),
        title,
        content,
        authorId,
      }
      posts.push(post)
      return post
    }),
})
