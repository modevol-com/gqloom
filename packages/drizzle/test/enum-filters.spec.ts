import { weave } from "@gqloom/core"
import * as pg from "drizzle-orm/pg-core"
import {
  GraphQLEnumType,
  GraphQLObjectType,
  lexicographicSortSchema,
  parse,
  printSchema,
  validate,
} from "graphql"
import { describe, expect, it } from "vitest"
import { DrizzleInputFactory, drizzleResolverFactory, drizzleSilk } from "../src"
import { drizzle } from "drizzle-orm/node-postgres"

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
    const filtersOrType = filtersType.getFields().OR.type as any
    const filtersOrFields = (
      filtersOrType.ofType.ofType as GraphQLObjectType
    ).getFields()

    const genderFilters = filtersOrFields.gender.type as GraphQLObjectType
    const statusFilters = filtersOrFields.status.type as GraphQLObjectType
    const contractTypeFilters = filtersOrFields.contractType
      .type as GraphQLObjectType
    const maritalStatusFilters = filtersOrFields.maritalStatus
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
    const db = drizzle("postgres://localhost/test", {
      schema: { employees },
    })
    const schema = weave(drizzleResolverFactory(db, employees).resolver())
    const printed = printSchema(lexicographicSortSchema(schema))

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
    const db = drizzle("postgres://localhost/test", {
      schema: { employees },
    })
    const schema = weave(drizzleResolverFactory(db, employees).resolver())

    const validQuery = parse(/* GraphQL */ `
      query {
        employees(where: { status: { eq: ACTIVE } }) {
          status
        }
      }
    `)
    expect(validate(schema, validQuery)).toEqual([])

    const invalidQuery = parse(/* GraphQL */ `
      query {
        employees(where: { status: { eq: MALE } }) {
          status
        }
      }
    `)
    expect(validate(schema, invalidQuery).map((error) => error.message)).toEqual(
      ['Value "MALE" does not exist in "EmployeeStatus" enum.']
    )
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

    const db = drizzle("postgres://localhost/test", {
      schema: { users, posts },
    })
    const schema = weave(
      drizzleResolverFactory(db, users).resolver({ name: "user" }),
      drizzleResolverFactory(db, posts).resolver({ name: "post" })
    )
    const printed = printSchema(lexicographicSortSchema(schema))

    expect(printed.match(/^input RoleFilters \{/m)?.length).toBe(1)
    expect(printed).toContain("role: RoleFilters")
    expect(printed).toContain("authorRole: RoleFilters")
  })
})
