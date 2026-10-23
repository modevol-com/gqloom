import type { ResolverPayload } from "@gqloom/core"
import { type Column, getTableName, SQL, type Table } from "drizzle-orm"
import {
  MySqlAsyncDatabase,
  MySqlColumn,
  MySqlTable,
} from "drizzle-orm/mysql-core"
import { PgAsyncDatabase, PgColumn, PgTable } from "drizzle-orm/pg-core"
import {
  SQLiteAsyncDatabase,
  SQLiteColumn,
  SQLiteTable,
} from "drizzle-orm/sqlite-core"
import { getSelectedColumns } from "../helper"
import type { BaseDatabase } from "./types"

export function countRows(
  db: BaseDatabase,
  table: Table,
  where?: SQL
): PromiseLike<number> {
  if (db instanceof PgAsyncDatabase) {
    return db.$count(requirePgTable(table), where)
  }
  if (db instanceof MySqlAsyncDatabase) {
    return db.$count(requireMySqlTable(table), where)
  }
  if (db instanceof SQLiteAsyncDatabase) {
    return db.$count(requireSQLiteTable(table), where)
  }
  return unreachable(db)
}

export function selectRows(
  db: BaseDatabase,
  table: Table,
  payload: ResolverPayload | undefined,
  opts: {
    where?: SQL
    orderBy?: (Column | SQL | SQL.Aliased)[]
    limit?: number
    offset?: number
  } = {}
): PromiseLike<unknown[]> {
  if (db instanceof PgAsyncDatabase) {
    const pgTable = requirePgTable(table)
    const from = db
      .select(definedSelectFields(getSelectedColumns(pgTable, payload)))
      .from(pgTable)
    const filtered = opts.where ? from.where(opts.where) : from
    const ordered = opts.orderBy?.length
      ? filtered.orderBy(...pgOrderBy(opts.orderBy))
      : filtered
    const limited = opts.limit != null ? ordered.limit(opts.limit) : ordered
    return opts.offset != null ? limited.offset(opts.offset) : limited
  }
  if (db instanceof MySqlAsyncDatabase) {
    const mysqlTable = requireMySqlTable(table)
    const from = db
      .select(definedSelectFields(getSelectedColumns(mysqlTable, payload)))
      .from(mysqlTable)
    const filtered = opts.where ? from.where(opts.where) : from
    const ordered = opts.orderBy?.length
      ? filtered.orderBy(...mysqlOrderBy(opts.orderBy))
      : filtered
    const limited = opts.limit != null ? ordered.limit(opts.limit) : ordered
    return opts.offset != null ? limited.offset(opts.offset) : limited
  }
  if (db instanceof SQLiteAsyncDatabase) {
    const sqliteTable = requireSQLiteTable(table)
    const from = db
      .select(definedSelectFields(getSelectedColumns(sqliteTable, payload)))
      .from(sqliteTable)
    const filtered = opts.where ? from.where(opts.where) : from
    const ordered = opts.orderBy?.length
      ? filtered.orderBy(...sqliteOrderBy(opts.orderBy))
      : filtered
    const limited = opts.limit != null ? ordered.limit(opts.limit) : ordered
    return opts.offset != null ? limited.offset(opts.offset) : limited
  }
  return unreachable(db)
}

export function selectRow(
  db: BaseDatabase,
  table: Table,
  payload: ResolverPayload | undefined,
  opts: {
    where?: SQL
    orderBy?: (Column | SQL | SQL.Aliased)[]
    offset?: number
  } = {}
): PromiseLike<unknown> {
  return selectRows(db, table, payload, { ...opts, limit: 1 }).then(
    (rows) => rows[0]
  )
}

/**
 * Drizzle types `TableRelationalConfig.relations` as `Record<string, Relation>`,
 * so `where.RAW` is treated as a relation name and `findMany` cannot accept
 * the runtime config we actually pass. Isolate that mismatch here.
 */
export interface RelationalFindManyConfig {
  where?: { RAW: SQL | ((table: unknown, operators: unknown) => SQL) }
  with?: Record<string, unknown>
  columns?: Record<string, boolean>
}

export function queryBuilderForTable(db: BaseDatabase, table: Table) {
  const name = Object.keys(db._.relations).find(
    (key) => db._.relations[key]?.table === table
  )
  if (name == null) return undefined

  return {
    findMany(config: RelationalFindManyConfig) {
      if (db instanceof PgAsyncDatabase) {
        return db.query[name].findMany(
          config as Parameters<(typeof db.query)[string]["findMany"]>[0]
        )
      }
      if (db instanceof MySqlAsyncDatabase) {
        return db.query[name].findMany(
          config as Parameters<(typeof db.query)[string]["findMany"]>[0]
        )
      }
      if (db instanceof SQLiteAsyncDatabase) {
        return db.query[name].findMany(
          config as Parameters<(typeof db.query)[string]["findMany"]>[0]
        )
      }
      return unreachable(db)
    },
  }
}

function definedSelectFields<T extends Record<string, unknown>>(columns: T) {
  const defined: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(columns)) {
    if (value !== undefined) defined[key] = value
  }
  return defined as {
    [K in keyof T as undefined extends T[K]
      ? [Exclude<T[K], undefined>] extends [never]
        ? never
        : K
      : K]: Exclude<T[K], undefined>
  }
}

function pgOrderBy(
  orderBy: (Column | SQL | SQL.Aliased)[]
): (PgColumn | SQL | SQL.Aliased)[] {
  return orderBy.filter(
    (item): item is PgColumn | SQL | SQL.Aliased =>
      item instanceof PgColumn ||
      item instanceof SQL ||
      item instanceof SQL.Aliased
  )
}

function mysqlOrderBy(
  orderBy: (Column | SQL | SQL.Aliased)[]
): (MySqlColumn | SQL | SQL.Aliased)[] {
  return orderBy.filter(
    (item): item is MySqlColumn | SQL | SQL.Aliased =>
      item instanceof MySqlColumn ||
      item instanceof SQL ||
      item instanceof SQL.Aliased
  )
}

function sqliteOrderBy(
  orderBy: (Column | SQL | SQL.Aliased)[]
): (SQLiteColumn | SQL | SQL.Aliased)[] {
  return orderBy.filter(
    (item): item is SQLiteColumn | SQL | SQL.Aliased =>
      item instanceof SQLiteColumn ||
      item instanceof SQL ||
      item instanceof SQL.Aliased
  )
}

function requirePgTable(table: Table): PgTable {
  if (table instanceof PgTable) return table
  throw new Error(
    `GQLoom-Drizzle Error: Expected a PostgreSQL table, got ${getTableName(table)}`
  )
}

function requireMySqlTable(table: Table): MySqlTable {
  if (table instanceof MySqlTable) return table
  throw new Error(
    `GQLoom-Drizzle Error: Expected a MySQL table, got ${getTableName(table)}`
  )
}

function requireSQLiteTable(table: Table): SQLiteTable {
  if (table instanceof SQLiteTable) return table
  throw new Error(
    `GQLoom-Drizzle Error: Expected a SQLite table, got ${getTableName(table)}`
  )
}

function unreachable(db: never): never {
  throw new Error(
    `GQLoom-Drizzle Error: Unsupported drizzle database ${String(db)}`
  )
}
