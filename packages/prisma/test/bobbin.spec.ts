import { describe, it, expect, beforeEach } from "vitest"
import * as g from "./generated"
import { PrismaClient } from "@prisma/client"
import { PrismaModelBobbin, type PrismaModelSilk } from "../src"
import { type InferSilkO, loom, weave } from "@gqloom/core"
import { createYoga } from "graphql-yoga"

const { resolver, query } = loom

class TestablePrismaModelBobbin<
  TModalSilk extends PrismaModelSilk<any, any>,
> extends PrismaModelBobbin<TModalSilk> {
  public uniqueWhere(instance: InferSilkO<NonNullable<TModalSilk>>): any {
    return super.uniqueWhere(instance)
  }
}

describe("Bobbin", () => {
  const db = new PrismaClient()

  it("should be able to create a bobbin", () => {
    const UserBobbin = new TestablePrismaModelBobbin(g.User, db)
    expect(UserBobbin).toBeDefined()
  })

  it("should be able to create a uniqueWhere condition", () => {
    const UserBobbin = new TestablePrismaModelBobbin(g.User, db)
    const userCondition = UserBobbin.uniqueWhere({
      id: 4,
      name: "",
      email: "",
    })
    expect(userCondition).toEqual({ id: 4 })

    const CatBobbin = new TestablePrismaModelBobbin(g.Cat, db)
    const catCondition = CatBobbin.uniqueWhere({
      firstName: "foo",
      lastName: "bar",
    })
    expect(catCondition).toEqual({
      firstName_lastName: { firstName: "foo", lastName: "bar" },
    })

    const DogBobbin = new TestablePrismaModelBobbin(g.Dog, db)
    const dogCondition = DogBobbin.uniqueWhere({
      firstName: "foo",
      lastName: "bar",
    })
    expect(dogCondition).toEqual({
      fullName: {
        firstName: "foo",
        lastName: "bar",
      },
    })
  })

  describe("relationField", () => {
    beforeEach(async () => {
      await db.user.deleteMany()
      await db.post.deleteMany()
    })
    const UserBobbin = new PrismaModelBobbin(g.User, db)
    const PostBobbin = new PrismaModelBobbin(g.Post, db)
    it("should be able to create a relationField", () => {
      const postsField = UserBobbin.relationField("posts")
      expect(postsField).toBeDefined()
      expect(postsField.output).toBeTypeOf("object")
      expect(postsField.type).toEqual("field")
      expect(postsField.resolve).toBeTypeOf("function")

      const userField = PostBobbin.relationField("author")
      expect(userField).toBeDefined()
      expect(userField.output).toBeTypeOf("object")
      expect(userField.type).toEqual("field")
      expect(userField.resolve).toBeTypeOf("function")
    })

    it("should be able to resolve a relationField", async () => {
      await db.user.create({
        data: {
          name: "John",
          email: "john@example.com",
          posts: {
            create: [{ title: "Hello World" }, { title: "Hello GQLoom" }],
          },
        },
      })

      const UserBobbin = new PrismaModelBobbin(g.User, db)
      const PostBobbin = new PrismaModelBobbin(g.Post, db)

      const r1 = resolver.of(g.User, {
        users: query(g.User.list(), () => db.user.findMany()),

        posts: UserBobbin.relationField("posts"),
      })

      const r2 = resolver.of(g.Post, {
        posts: query(g.Post.list(), () => db.post.findMany()),

        author: PostBobbin.relationField("author"),
      })
      const schema = weave(r1, r2)
      const yoga = createYoga({ schema })
      const response = await yoga.fetch("http://localhost/graphql", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          query: /* GraphQL */ `
            query {
              users {
                name
                posts {
                  title
                }
              }
              posts {
                title
                author {
                  name
                }
              }
            }
          `,
        }),
      })

      if (response.status !== 200) throw new Error("unexpected")
      const json = await response.json()
      expect(json).toMatchObject({
        data: {
          users: [
            {
              name: "John",
              posts: [{ title: "Hello World" }, { title: "Hello GQLoom" }],
            },
          ],
          posts: [
            { title: "Hello World", author: { name: "John" } },
            { title: "Hello GQLoom", author: { name: "John" } },
          ],
        },
      })
    })
  })
})
