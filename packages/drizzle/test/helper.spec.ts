import type { Table } from "drizzle-orm"
import type { Column } from "drizzle-orm"
import { sql } from "drizzle-orm"
import * as mysql from "drizzle-orm/mysql-core"
import * as pg from "drizzle-orm/pg-core"
import { describe, expect, it } from "vitest"
import {
  getEnumNameByColumn,
  inArrayMultiple,
  isColumnVisible,
} from "../src/helper"
import type { DrizzleFactoryInputVisibilityBehaviors } from "../src/types"

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
})
