import { describe, it, expect } from "vitest"
import * as g from "./generated"
import { PrismaClient } from "@prisma/client"
import { PrismaModelBobbin, type PrismaModelSilk } from "../src"
import { type InferSilkO } from "@gqloom/core"

class TestablePrismaModelBobbin<
  TModalSilk extends PrismaModelSilk<any, any>,
> extends PrismaModelBobbin<TModalSilk> {
  public uniqueWhere(instance: InferSilkO<NonNullable<TModalSilk>>): any {
    return super.uniqueWhere(instance)
  }
}

describe("Bobbin", () => {
  const db = new PrismaClient()
  db.cat.findUnique({
    where: { firstName_lastName: { firstName: "", lastName: "" } },
  })
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
  })
})
