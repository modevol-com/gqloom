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

  it("should generate input types for a table", () => {
    const inputWeaver = new DrizzleInputWeaver(userTable)
    expect(printType(inputWeaver.insertInput())).toMatchInlineSnapshot(`
      "type UsersInsertInput {
        id: Int
        name: String
        email: String!
      }"
    `)
  })
})
