import { mutation, resolver } from "@gqloom/core"
import { z } from "zod"
import { useUser } from "./context"

const Post = z.object({
  __typename: z.literal("Post").nullish(),
  id: z.number(),
  title: z.string(),
  content: z.string(),
  authorId: z.number(),
})

interface IPost extends z.output<typeof Post> {}

const posts: IPost[] = []

export const postsResolver = resolver({
  createPost: mutation(Post)
    .input(
      z.object({
        title: z.string(),
        content: z.string(),
        authorId: z.number(),
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
