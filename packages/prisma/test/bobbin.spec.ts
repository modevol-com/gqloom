import { describe, it, expect } from "vitest"
import * as g from "./generated"
import { PrismaClient } from "@prisma/client"
import { PrismaModelBobbin } from "../src"

describe("Bobbin", () => {
  const db = new PrismaClient()
  it("should be able to create a bobbin", async () => {
    const UserBobbin = new PrismaModelBobbin(g.User, db)
    expect(UserBobbin).toBeDefined()
  })

  describe("relationField", () => {
    const UserBobbin = new PrismaModelBobbin(g.User, db)
    it("should be able to create a relationField", async () => {
      const relationField = UserBobbin.relationField("posts")
      expect(relationField).toBeDefined()
      expect(relationField.output).toBeTypeOf("object")
      expect(relationField.type).toEqual("field")
      expect(relationField.resolve).toBeTypeOf("function")
    })
  })
})
