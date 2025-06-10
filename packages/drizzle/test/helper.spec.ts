import { field, query, resolver, silk, weave } from "@gqloom/core"
import type { Table } from "drizzle-orm"
import type { Column } from "drizzle-orm"
import { and, eq, inArray, sql } from "drizzle-orm"
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
  paramsAsKey,
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

describe("paramsAsKey", () => {
  it("should handle null and undefined", () => {
    expect(paramsAsKey(null)).toBe("null")
    expect(paramsAsKey(undefined)).toBe("undefined")
  })

  it("should handle primitive values", () => {
    expect(paramsAsKey(42)).toBe("42")
    expect(paramsAsKey("hello")).toBe("hello")
    expect(paramsAsKey(true)).toBe("true")
  })

  it("should handle flat objects", () => {
    const obj = { a: 1, b: "test", c: true }
    expect(paramsAsKey(obj)).toBe("a=1&b=test&c=true")
  })

  it("should handle nested objects", () => {
    const obj = {
      a: 1,
      b: {
        c: "test",
        d: {
          e: true,
        },
      },
    }
    expect(paramsAsKey(obj)).toBe("a=1&b.c=test&b.d.e=true")
  })

  it("should handle arrays", () => {
    const obj = {
      a: [1, 2, 3],
      b: {
        c: ["x", "y"],
      },
    }
    expect(paramsAsKey(obj)).toBe("a.0=1&a.1=2&a.2=3&b.c.0=x&b.c.1=y")
  })

  it("should generate same key for objects with different key order", () => {
    const obj1 = { a: 1, b: 2, c: 3 }
    const obj2 = { c: 3, a: 1, b: 2 }
    expect(paramsAsKey(obj1)).toBe(paramsAsKey(obj2))
  })

  it("should handle null values in objects", () => {
    const obj = { a: null, b: undefined, c: 1 }
    expect(paramsAsKey(obj)).toBe("a=&b=&c=1")
  })

  it("should handle array of objects", () => {
    const arr = [
      { a: 1, b: 2 },
      { a: 3, b: 4 },
    ]
    expect(paramsAsKey(arr)).toBe("0.a=1&0.b=2&1.a=3&1.b=4")
  })

  it("should handle object with array of objects", () => {
    const obj = {
      group: [
        { id: 1, name: "foo" },
        { id: 2, name: "bar" },
      ],
    }

    expect(paramsAsKey(obj)).toBe(
      "group.0.id=1&group.0.name=foo&group.1.id=2&group.1.name=bar"
    )
  })

  it("should handle functions", () => {
    const obj = {
      foo: () => void 0,
      bar: function test() {
        return 1
      },
      baz: "normal",
    }
    expect(paramsAsKey(obj)).toBe("bar=[Function]&baz=normal&foo=[Function]")
  })

  it("should handle recursive objects", () => {
    const foo: any = {
      bar: {},
      normal: "value",
    }
    foo.bar = foo
    expect(paramsAsKey(foo)).toBe("bar=[Circular]()&normal=value")

    const o1 = {
      a: 1,
      b: 2,
      foo,
    }
    const o2 = {
      a: 1,
      b: 2,
      foo,
    }
    expect(paramsAsKey(o1)).toBe(paramsAsKey(o2))
    expect(paramsAsKey(o1)).toBe(
      "a=1&b=2&foo.bar=[Circular](foo)&foo.normal=value"
    )
  })

  it("should drizzle sql", () => {
    expect(paramsAsKey(sql`1`)).toEqual(paramsAsKey(sql`1`))
    expect(paramsAsKey(sql`1`)).not.toEqual(paramsAsKey(sql`2`))
    expect(paramsAsKey(and(eq(sqliteTables.users.id, 2)))).toEqual(
      paramsAsKey(and(eq(sqliteTables.users.id, 2)))
    )
    expect(paramsAsKey(and(eq(sqliteTables.users.id, 2)))).not.toEqual(
      paramsAsKey(and(eq(sqliteTables.users.id, 3)))
    )
    expect(paramsAsKey(inArray(sqliteTables.users.id, [2]))).toEqual(
      paramsAsKey(inArray(sqliteTables.users.id, [2]))
    )
    expect(paramsAsKey(inArray(sqliteTables.users.id, [2]))).not.toEqual(
      paramsAsKey(inArray(sqliteTables.users.id, [3]))
    )
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
