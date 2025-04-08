import * as mysql from "drizzle-orm/mysql-core"
import * as pg from "drizzle-orm/pg-core"
import { describe, expect, it } from "vitest"
import { getEnumNameByColumn } from "../src/utils"

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
