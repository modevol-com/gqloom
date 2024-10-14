import { describe, it, expect } from "vitest"
import { PrismaModelBobbin } from "../src"
import * as p from "./generated"
import { PrismaClient } from "@prisma/client"

describe("Bobbin Resolver", () => {
  const db = new PrismaClient()
  const userBobbin = new PrismaModelBobbin(p.User, db)
  const userResolver = userBobbin.resolver()

  it("should be able to create Bobbin", () => {
    expect(userResolver).toBeDefined()
  })

  it("should be able to create countQuery", async () => {
    expect(userResolver.countUser).toBeDefined()
    expect(userResolver.countUser.type).toEqual("query")
    expect(userResolver.countUser.resolve).toBeTypeOf("function")
  })

  it("should be able to create findFirstQuery", async () => {
    expect(userResolver.findFirstUser).toBeDefined()
    expect(userResolver.findFirstUser.type).toEqual("query")
    expect(userResolver.findFirstUser.resolve).toBeTypeOf("function")
  })

  it("should be able to create findManyQuery", async () => {
    expect(userResolver.findManyUser).toBeDefined()
    expect(userResolver.findManyUser.type).toEqual("query")
    expect(userResolver.findManyUser.resolve).toBeTypeOf("function")
  })

  it("should be able to create findUniqueQuery", async () => {
    expect(userResolver.findUniqueUser).toBeDefined()
    expect(userResolver.findUniqueUser.type).toEqual("query")
    expect(userResolver.findUniqueUser.resolve).toBeTypeOf("function")
  })
})
