import { field, initWeaverContext, provideWeaverContext, weave } from "@gqloom/core"
import { ValibotWeaver } from "@gqloom/valibot"
import { defineRelations } from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import * as pg from "drizzle-orm/pg-core"
import {
  GraphQLEnumType,
  GraphQLObjectType,
  GraphQLScalarType,
  lexicographicSortSchema,
  parse,
  printSchema,
  printType,
  validate,
} from "graphql"
import * as v from "valibot"
import { describe, expect, it } from "vitest"
import {
  DrizzleInputFactory,
  drizzleResolverFactory,
  drizzleSilk,
} from "../src"
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
    const weaverContext = initWeaverContext()
    weaverContext.vendorWeavers.set(ValibotWeaver.vendor, ValibotWeaver)

    it("should respect column visibility in InsertInput", () => {
      expect(
        printType(
          provideWeaverContext(
            () => inputFactoryWithOptions.insertInput(),
            weaverContext
          )
        )
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
        printType(
          provideWeaverContext(
            () => inputFactoryWithOptions.updateInput(),
            weaverContext
          )
        )
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

  describe("pg enum column filters", () => {
    const genderEnum = pg.pgEnum("gender", ["MALE", "FEMALE", "OTHER"])
    const employeeStatusEnum = pg.pgEnum("employee_status", [
      "probation",
      "active",
      "resigned",
    ])
    const contractTypeEnum = pg.pgEnum("contract_type", [
      "full_time",
      "part_time",
      "intern",
    ])
    const maritalStatusEnum = pg.pgEnum("marital_status", [
      "single",
      "married",
      "divorced",
    ])

    const employees = drizzleSilk(
      pg.pgTable("employees", {
        id: pg.uuid("id").defaultRandom().primaryKey(),
        name: pg.varchar("name", { length: 50 }).notNull(),
        gender: genderEnum("gender"),
        maritalStatus: maritalStatusEnum("marital_status"),
        status: employeeStatusEnum("status").notNull().default("probation"),
        contractType: contractTypeEnum("contract_type"),
      }),
      { name: "Employee" }
    )

    it("should type each enum column filter with its own enum", () => {
      const inputFactory = new DrizzleInputFactory(employees)
      const filtersType = inputFactory.filters()
      const filtersNestedType = filtersType.getFields().OR.type as any
      const filtersNestedFields = (
        filtersNestedType.ofType.ofType as GraphQLObjectType
      ).getFields()

      const genderFilters = filtersNestedFields.gender.type as GraphQLObjectType
      const statusFilters = filtersNestedFields.status.type as GraphQLObjectType
      const contractTypeFilters = filtersNestedFields.contractType
        .type as GraphQLObjectType
      const maritalStatusFilters = filtersNestedFields.maritalStatus
        .type as GraphQLObjectType

      expect(genderFilters.name).toBe("GenderFilters")
      expect(statusFilters.name).toBe("EmployeeStatusFilters")
      expect(contractTypeFilters.name).toBe("ContractTypeFilters")
      expect(maritalStatusFilters.name).toBe("MaritalStatusFilters")

      expect(
        (genderFilters.getFields().eq.type as GraphQLEnumType).name
      ).toBe("Gender")
      expect(
        (statusFilters.getFields().eq.type as GraphQLEnumType).name
      ).toBe("EmployeeStatus")
      expect(
        (contractTypeFilters.getFields().eq.type as GraphQLEnumType).name
      ).toBe("ContractType")
      expect(
        (maritalStatusFilters.getFields().eq.type as GraphQLEnumType).name
      ).toBe("MaritalStatus")
    })

    it("should generate distinct filter input types per enum in woven schema", () => {
      const schema = { employees }
      const relations = defineRelations(schema, () => ({}))
      const db = drizzle("postgres://localhost/test", { relations })
      const gqlSchema = weave(drizzleResolverFactory(db, employees).resolver())
      const printed = printSchema(lexicographicSortSchema(gqlSchema))

      expect(printed).toContain("input GenderFilters")
      expect(printed).toContain("input EmployeeStatusFilters")
      expect(printed).toContain("input ContractTypeFilters")
      expect(printed).toContain("input MaritalStatusFilters")
      expect(printed).not.toContain("PgEnumColumnFilters")

      expect(printed).toMatch(/input GenderFilters[\s\S]*?eq: Gender/)
      expect(printed).toMatch(
        /input EmployeeStatusFilters[\s\S]*?eq: EmployeeStatus/
      )
      expect(printed).toMatch(
        /input ContractTypeFilters[\s\S]*?eq: ContractType/
      )
      expect(printed).toMatch(
        /input MaritalStatusFilters[\s\S]*?eq: MaritalStatus/
      )
    })

    it("should validate filter variables against the correct enum", () => {
      const schema = { employees }
      const relations = defineRelations(schema, () => ({}))
      const db = drizzle("postgres://localhost/test", { relations })
      const gqlSchema = weave(drizzleResolverFactory(db, employees).resolver())

      const validQuery = parse(/* GraphQL */ `
        query {
          employees(where: { status: { eq: ACTIVE } }) {
            status
          }
        }
      `)
      expect(validate(gqlSchema, validQuery)).toEqual([])

      const invalidQuery = parse(/* GraphQL */ `
        query {
          employees(where: { status: { eq: MALE } }) {
            status
          }
        }
      `)
      expect(
        validate(gqlSchema, invalidQuery).map((error) => error.message)
      ).toEqual(['Value "MALE" does not exist in "EmployeeStatus" enum.'])
    })

    it("should reuse the same filter type for columns sharing an enum", () => {
      const roleEnum = pg.pgEnum("role", ["admin", "user"])

      const users = drizzleSilk(
        pg.pgTable("users", {
          id: pg.serial("id").primaryKey(),
          role: roleEnum("role"),
        })
      )
      const posts = drizzleSilk(
        pg.pgTable("posts", {
          id: pg.serial("id").primaryKey(),
          authorRole: roleEnum("author_role"),
        })
      )

      const schema = { users, posts }
      const relations = defineRelations(schema, () => ({}))
      const db = drizzle("postgres://localhost/test", { relations })
      const gqlSchema = weave(
        drizzleResolverFactory(db, users).resolver(),
        drizzleResolverFactory(db, posts).resolver()
      )
      const printed = printSchema(lexicographicSortSchema(gqlSchema))

      expect(printed.match(/^input RoleFilters \{/m)?.length).toBe(1)
      expect(printed).toContain("role: RoleFilters")
      expect(printed).toContain("authorRole: RoleFilters")
    })
  })
})
