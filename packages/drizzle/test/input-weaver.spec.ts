import * as pg from "drizzle-orm/pg-core"
import { printType } from "graphql"
import { describe, expect, it } from "vitest"
import { DrizzleInputWeaver } from "../src"

describe("DrizzleInputWeaver", () => {
  const userTable = pg.pgTable("users", {
    id: pg.serial("id").primaryKey(),
    name: pg
      .text("name")
      .notNull()
      .$defaultFn(() => "John Doe"),
    email: pg.text("email").notNull(),
  })

  const inputWeaver = new DrizzleInputWeaver(userTable)
  it("should generate InsertInput type for a table", () => {
    expect(printType(inputWeaver.insertInput())).toMatchInlineSnapshot(`
      "type UsersInsertInput {
        id: Int
        name: String
        email: String!
      }"
    `)
  })

  it("should generate UpdateInput type for a table", () => {
    expect(printType(inputWeaver.updateInput())).toMatchInlineSnapshot(`
      "type UsersUpdateInput {
        id: Int
        name: String
        email: String
      }"
    `)
  })
})
