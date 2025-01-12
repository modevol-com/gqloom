import * as pg from "drizzle-orm/pg-core"
import { printType } from "graphql"
import { describe, expect, it } from "vitest"
import { DrizzleInputFactory } from "../src"

describe("DrizzleInputFactory", () => {
  const userTable = pg.pgTable("users", {
    id: pg.serial("id").primaryKey(),
    name: pg
      .text("name")
      .notNull()
      .$defaultFn(() => "John Doe"),
    email: pg.text("email").notNull(),
  })

  const inputFactory = new DrizzleInputFactory(userTable)
  it("should generate InsertInput type for a table", () => {
    expect(printType(inputFactory.insertInput())).toMatchInlineSnapshot(`
      "type UsersInsertInput {
        id: Int
        name: String
        email: String!
      }"
    `)
  })

  it("should generate UpdateInput type for a table", () => {
    expect(printType(inputFactory.updateInput())).toMatchInlineSnapshot(`
      "type UsersUpdateInput {
        id: Int
        name: String
        email: String
      }"
    `)
  })

  it("should generate Filters type for a table", () => {
    expect(printType(inputFactory.filters())).toMatchInlineSnapshot(`
      "type UsersFilters {
        id: PgSerialFilters
        name: PgTextFilters
        email: PgTextFilters
        OR: [UsersFiltersOr!]
      }"
    `)
  })
})
