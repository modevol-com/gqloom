import { field } from "@gqloom/core"
import * as pg from "drizzle-orm/pg-core"
import { GraphQLScalarType, printType } from "graphql"
import * as v from "valibot"
import { describe, expect, it } from "vitest"
import { DrizzleInputFactory, drizzleSilk } from "../src"
import type { DrizzleFactoryInputBehaviors } from "../src/types"

describe("DrizzleInputFactory", () => {
  const userTable = pg.pgTable("users", {
    id: pg.serial("id").primaryKey(),
    name: pg
      .text("name")
      .notNull()
      .$defaultFn(() => "John Doe"),
    email: pg.text("email").notNull(),
    password: pg.text("password").notNull(),
    createdAt: pg.timestamp("created_at").notNull().defaultNow(),
    updatedAt: pg.timestamp("updated_at").notNull().defaultNow(),
  })

  const inputFactory = new DrizzleInputFactory(userTable)
  it("should generate InsertInput type for a table", () => {
    expect(printType(inputFactory.insertInput())).toMatchInlineSnapshot(`
      "type UsersInsertInput {
        id: Int
        name: String
        email: String!
        password: String!
        createdAt: String
        updatedAt: String
      }"
    `)
  })

  it("should generate UpdateInput type for a table", () => {
    expect(printType(inputFactory.updateInput())).toMatchInlineSnapshot(`
      "type UsersUpdateInput {
        id: Int
        name: String
        email: String
        password: String
        createdAt: String
        updatedAt: String
      }"
    `)
  })

  it("should generate Filters type for a table", () => {
    expect(printType(inputFactory.filters())).toMatchInlineSnapshot(`
      "type UsersFilters {
        id: PgSerialFilters
        name: PgTextFilters
        email: PgTextFilters
        password: PgTextFilters
        createdAt: PgTimestampFilters
        updatedAt: PgTimestampFilters
        OR: [UsersFiltersNested!]
        AND: [UsersFiltersNested!]
        NOT: UsersFiltersNested
      }"
    `)
  })

  it("should generate OrderBy type for a table", () => {
    expect(printType(inputFactory.orderBy())).toMatchInlineSnapshot(`
      "type UsersOrderBy {
        id: OrderDirection
        name: OrderDirection
        email: OrderDirection
        password: OrderDirection
        createdAt: OrderDirection
        updatedAt: OrderDirection
      }"
    `)
  })

  it("should generate TableColumnEnum type for a table", () => {
    expect(printType(inputFactory.tableColumnEnum())).toMatchInlineSnapshot(`
      "enum UsersTableColumn {
        id
        name
        email
        password
        createdAt
        updatedAt
      }"
    `)
  })

  it("should generate InsertOnConflictDoUpdateInput type for a table", () => {
    expect(
      printType(inputFactory.insertOnConflictDoUpdateInput())
    ).toMatchInlineSnapshot(`
      "type UsersInsertOnConflictDoUpdateInput {
        target: [UsersTableColumn!]!
        set: UsersUpdateInput
        targetWhere: UsersFilters
        setWhere: UsersFilters
      }"
    `)
  })

  it("should generate InsertOnConflictDoNothingInput type for a table", () => {
    expect(
      printType(inputFactory.insertOnConflictDoNothingInput())
    ).toMatchInlineSnapshot(`
      "type UsersInsertOnConflictDoNothingInput {
        target: [UsersTableColumn!]
        where: UsersFilters
      }"
    `)
  })

  describe("with column visibility options", () => {
    const options: DrizzleFactoryInputBehaviors<typeof userTable> = {
      email: v.pipe(v.string(), v.email()),
      "*": {
        filters: true,
        insert: true,
        update: true,
      },
      password: {
        filters: field.hidden,
        insert: true,
        update: true,
      },
      createdAt: {
        filters: true,
        insert: false,
        update: false,
      },
      updatedAt: {
        filters: true,
        insert: false,
        update: false,
      },
    }

    const inputFactoryWithOptions = new DrizzleInputFactory(userTable, {
      input: options,
    })

    it("should respect column visibility in InsertInput", () => {
      expect(
        printType(inputFactoryWithOptions.insertInput())
      ).toMatchInlineSnapshot(`
        "type UsersInsertInput {
          id: Int
          name: String
          email: String!
          password: String!
        }"
      `)
    })

    it("should respect column visibility in UpdateInput", () => {
      expect(
        printType(inputFactoryWithOptions.updateInput())
      ).toMatchInlineSnapshot(`
        "type UsersUpdateInput {
          id: Int
          name: String
          email: String
          password: String
        }"
      `)
    })

    it("should respect column visibility in Filters", () => {
      expect(
        printType(inputFactoryWithOptions.filters())
      ).toMatchInlineSnapshot(`
        "type UsersFilters {
          id: PgSerialFilters
          name: PgTextFilters
          email: PgTextFilters
          createdAt: PgTimestampFilters
          updatedAt: PgTimestampFilters
          OR: [UsersFiltersNested!]
          AND: [UsersFiltersNested!]
          NOT: UsersFiltersNested
        }"
      `)
    })

    it("should respect column visibility in OrderBy", () => {
      expect(
        printType(inputFactoryWithOptions.orderBy())
      ).toMatchInlineSnapshot(`
        "type UsersOrderBy {
          id: OrderDirection
          name: OrderDirection
          email: OrderDirection
          password: OrderDirection
          createdAt: OrderDirection
          updatedAt: OrderDirection
        }"
      `)
    })
  })

  describe("custom column types", () => {
    const EmailAddress = new GraphQLScalarType<string>({
      name: "EmailAddress",
      description: "A valid email address",
      parseValue: (value) => String(value),
      serialize: (value) => String(value),
    })

    const userTags = drizzleSilk(
      pg.pgTable("userTags", {
        id: pg.serial("id").primaryKey(),
        email: pg.text("email").notNull(),
      }),
      {
        fields: {
          email: { type: EmailAddress },
        },
      }
    )

    const inputFactory = new DrizzleInputFactory(userTags)

    it("should respect column types in InsertInput", () => {
      expect(printType(inputFactory.insertInput())).toMatchInlineSnapshot(`
        "type UserTagsInsertInput {
          id: Int
          email: EmailAddress!
        }"
      `)
    })

    it("should respect column types in UpdateInput", () => {
      expect(printType(inputFactory.updateInput())).toMatchInlineSnapshot(`
        "type UserTagsUpdateInput {
          id: Int
          email: EmailAddress
        }"
      `)
    })
  })
})
