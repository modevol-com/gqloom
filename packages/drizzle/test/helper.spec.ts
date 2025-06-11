import { field, query, resolver, silk, weave } from "@gqloom/core"
import type { Table } from "drizzle-orm"
import type { Column } from "drizzle-orm"
import { sql } from "drizzle-orm"
import * as mysql from "drizzle-orm/mysql-core"
import * as pg from "drizzle-orm/pg-core"
import { GraphQLString, execute, parse } from "graphql"
import { beforeEach, describe, expect, it } from "vitest"
import {
  getEnumNameByColumn,
  getPrimaryColumns,
  getSelectedColumns,
  getValue,
  inArrayMultiple,
  isColumnVisible,
} from "../src/helper"
import type { DrizzleFactoryInputVisibilityBehaviors } from "../src/types"
import * as mysqlTables from "./schema/mysql"
import * as pgTables from "./schema/postgres"
import * as sqliteTables from "./schema/sqlite"

describe("getEnumNameByColumn", () => {
  it("should return the enum name for a pg enum column", () => {
    const mood = pg.pgEnum("mood", ["sad", "ok", "happy"])
    const table = pg.pgTable("foo_table", {
      bar_column: mood(),
    })
    expect(getEnumNameByColumn(table.bar_column)).toBe("Mood")
  })

  it("should return the enum name for a mysql enum column", () => {
    const table = mysql.mysqlTable("foo_table", {
      bar_column: mysql.mysqlEnum(["sad", "ok", "happy"]),
    })
    expect(getEnumNameByColumn(table.bar_column)).toBe("FooTableBarColumnEnum")
  })

  it("should return undefined for a non-enum column", () => {
    const table = pg.pgTable("test", {
      id: pg.serial("id").primaryKey(),
    })
    expect(getEnumNameByColumn(table.id)).toBeUndefined()
  })
})

describe("helper", () => {
  describe("inArrayMultiple", () => {
    it("should handle empty values", () => {
      const columns: Column[] = []
      const values: unknown[][] = []
      const result = inArrayMultiple(columns, values, {})
      expect(result).toEqual(sql`FALSE`)
    })
  })

  describe("isColumnVisible", () => {
    it("should handle boolean configuration", () => {
      const options: DrizzleFactoryInputVisibilityBehaviors<Table> = {
        "*": true,
        column1: false,
        column2: {
          filters: true,
          insert: false,
          update: true,
        },
      }

      expect(isColumnVisible("column1", options, "filters")).toBe(false)
      expect(isColumnVisible("column2", options, "filters")).toBe(true)
      expect(isColumnVisible("column2", options, "insert")).toBe(false)
      expect(isColumnVisible("column2", options, "update")).toBe(true)
      expect(isColumnVisible("column3", options, "filters")).toBe(true)
    })
  })

  describe("getValue", () => {
    it("should return the value directly when given a non-function value", () => {
      expect(getValue(42)).toBe(42)
      expect(getValue("hello")).toBe("hello")
      expect(getValue({ foo: "bar" })).toEqual({ foo: "bar" })
    })

    it("should execute and return the result when given a function", () => {
      expect(getValue(() => 42)).toBe(42)
      expect(getValue(() => "hello")).toBe("hello")
      expect(getValue(() => ({ foo: "bar" }))).toEqual({ foo: "bar" })
    })

    it("should handle complex types", () => {
      type ComplexType = { id: number; name: string }
      const value: ComplexType = { id: 1, name: "test" }
      expect(getValue(value)).toEqual(value)
      expect(getValue(() => value)).toEqual(value)
    })
  })
})

describe("getSelectedColumns", () => {
  const selectedColumns = new Set<string>()
  const r = resolver.of(sqliteTables.users, {
    users: query(sqliteTables.users.$list()).resolve((_input, payload) => {
      for (const column of Object.keys(
        getSelectedColumns(sqliteTables.users, payload)
      )) {
        selectedColumns.add(column)
      }
      return []
    }),

    greeting: field(silk(GraphQLString))
      .derivedFrom("name")
      .resolve((user) => `Hello ${user.name}`),
  })
  const schema = weave(r)
  beforeEach(() => {
    selectedColumns.clear()
  })
  it("should access selected columns", async () => {
    const query = parse(/* GraphQL */ `
      query {
        users {
          id
          name
        }
      }
    `)
    await execute({ schema, document: query })
    expect(selectedColumns).toEqual(new Set(["id", "name"]))
  })

  it("should handle derived fields", async () => {
    const query = parse(/* GraphQL */ `
      query {
        users {
          id
          greeting
        }
      }
    `)
    await execute({ schema, document: query })
    expect(selectedColumns).toEqual(new Set(["id", "name"]))
  })
})

describe("getPrimaryColumns", () => {
  it("should return the primary columns for a table", () => {
    expect(getPrimaryColumns(sqliteTables.users)).toEqual([
      ["id", sqliteTables.users.id],
    ])
  })

  it("should return the primary columns for a sqlite table with a composite primary key", () => {
    expect(getPrimaryColumns(sqliteTables.userStarPosts)).toEqual([
      ["userId", sqliteTables.userStarPosts.userId],
      ["postId", sqliteTables.userStarPosts.postId],
    ])
  })

  it("should return the primary columns for a mysql table with a composite primary key", () => {
    expect(getPrimaryColumns(mysqlTables.userStarPosts)).toEqual([
      ["userId", mysqlTables.userStarPosts.userId],
      ["postId", mysqlTables.userStarPosts.postId],
    ])
  })

  it("should return the primary columns for a pg table with a composite primary key", () => {
    expect(getPrimaryColumns(pgTables.userStarPosts)).toEqual([
      ["userId", pgTables.userStarPosts.userId],
      ["postId", pgTables.userStarPosts.postId],
    ])
  })
})
