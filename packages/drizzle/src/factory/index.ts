import { getTableName, isTable, type Table } from "drizzle-orm"
import { MySqlAsyncDatabase, MySqlTable } from "drizzle-orm/mysql-core"
import { PgAsyncDatabase, PgTable } from "drizzle-orm/pg-core"
import type { SQLiteAsyncDatabase } from "drizzle-orm/sqlite-core"
import { SQLiteTable } from "drizzle-orm/sqlite-core"
import type { DrizzleResolverFactoryOptions } from "../types"
import { DrizzleMySQLResolverFactory } from "./resolver-mysql"
import { DrizzlePostgresResolverFactory } from "./resolver-postgres"
import { DrizzleSQLiteResolverFactory } from "./resolver-sqlite"
import type { BaseDatabase } from "./types"

/**
 * Create a resolver factory for SQLite databases.
 *
 * @param db - The SQLite database instance.
 * @param table - The table to create a resolver factory for.
 * @param options - The options for the resolver factory.
 */
export function drizzleResolverFactory<
  TDatabase extends SQLiteAsyncDatabase<any, any, any>,
  TTable extends SQLiteTable,
>(
  db: TDatabase,
  table: TTable,
  options?: DrizzleResolverFactoryOptions<TTable>
): DrizzleSQLiteResolverFactory<TDatabase, TTable>

/**
 * @deprecated directly use `table` instead of `tableName`.
 *
 * ## Example
 * ⛔️ Don't do this
 * ```ts
 * const userFactory = drizzleResolverFactory(db, "users")
 * ```
 * ✅ Do this
 * ```ts
 * const userFactory = drizzleResolverFactory(db, users)
 * ```
 */
export function drizzleResolverFactory<
  TDatabase extends SQLiteAsyncDatabase<any, any, any>,
  TTableName extends keyof TDatabase["_"]["relations"],
>(
  db: TDatabase,
  tableName: TTableName,
  options?: DrizzleResolverFactoryOptions<
    Extract<TDatabase["_"]["relations"][TTableName]["table"], SQLiteTable>
  >
): DrizzleSQLiteResolverFactory<
  TDatabase,
  Extract<TDatabase["_"]["relations"][TTableName]["table"], SQLiteTable>
>

/**
 * Create a resolver factory for PostgreSQL databases.
 *
 * @param db - The PostgreSQL database instance.
 * @param table - The table to create a resolver factory for.
 * @param options - The options for the resolver factory.
 */
export function drizzleResolverFactory<
  TDatabase extends PgAsyncDatabase<any, any>,
  TTable extends PgTable,
>(
  db: TDatabase,
  table: TTable,
  options?: DrizzleResolverFactoryOptions<TTable>
): DrizzlePostgresResolverFactory<TDatabase, TTable>

/**
 * Create a resolver factory for MySQL databases.
 *
 * @param db - The MySQL database instance.
 * @param table - The table to create a resolver factory for.
 * @param options - The options for the resolver factory.
 */
export function drizzleResolverFactory<
  TDatabase extends MySqlAsyncDatabase<any, any>,
  TTable extends MySqlTable,
>(
  db: TDatabase,
  table: TTable,
  options?: DrizzleResolverFactoryOptions<TTable>
): DrizzleMySQLResolverFactory<TDatabase, TTable>

/**
 * @deprecated directly use `table` instead of `tableName`.
 *
 * ## Example
 * ⛔️ Don't do this
 * ```ts
 * const userFactory = drizzleResolverFactory(db, "users")
 * ```
 * ✅ Do this
 * ```ts
 * const userFactory = drizzleResolverFactory(db, users)
 * ```
 */
export function drizzleResolverFactory<
  TDatabase extends PgAsyncDatabase<any, any>,
  TTableName extends keyof TDatabase["_"]["relations"],
>(
  db: TDatabase,
  tableName: TTableName,
  options?: DrizzleResolverFactoryOptions<
    Extract<TDatabase["_"]["relations"][TTableName]["table"], PgTable>
  >
): DrizzlePostgresResolverFactory<
  TDatabase,
  Extract<TDatabase["_"]["relations"][TTableName]["table"], PgTable>
>

/**
 * @deprecated directly use `table` instead of `tableName`.
 *
 * ## Example
 * ⛔️ Don't do this
 * ```ts
 * const userFactory = drizzleResolverFactory(db, "users")
 * ```
 * ✅ Do this
 * ```ts
 * const userFactory = drizzleResolverFactory(db, users)
 * ```
 */
export function drizzleResolverFactory<
  TDatabase extends MySqlAsyncDatabase<any, any>,
  TTableName extends keyof TDatabase["_"]["relations"],
>(
  db: TDatabase,
  tableName: TTableName,
  options?: DrizzleResolverFactoryOptions<
    Extract<TDatabase["_"]["relations"][TTableName]["table"], MySqlTable>
  >
): DrizzleMySQLResolverFactory<
  TDatabase,
  Extract<TDatabase["_"]["relations"][TTableName]["table"], MySqlTable>
>

export function drizzleResolverFactory(
  db: BaseDatabase,
  tableOrName: Table | string,
  options?: DrizzleResolverFactoryOptions<Table>
) {
  const table =
    typeof tableOrName === "string"
      ? requireNamedTable(db, tableOrName)
      : tableOrName
  if (db instanceof PgAsyncDatabase) {
    if (!(table instanceof PgTable)) {
      throw new Error(
        `GQLoom-Drizzle Error: Expected a PostgreSQL table, got ${getTableName(table)}`
      )
    }
    return new DrizzlePostgresResolverFactory(db, table, options)
  }
  if (db instanceof MySqlAsyncDatabase) {
    if (!(table instanceof MySqlTable)) {
      throw new Error(
        `GQLoom-Drizzle Error: Expected a MySQL table, got ${getTableName(table)}`
      )
    }
    return new DrizzleMySQLResolverFactory(db, table, options)
  }
  if (!(table instanceof SQLiteTable)) {
    throw new Error(
      `GQLoom-Drizzle Error: Expected a SQLite table, got ${getTableName(table)}`
    )
  }
  return new DrizzleSQLiteResolverFactory(db, table, options)
}

function requireNamedTable(db: BaseDatabase, tableName: string): Table {
  const table = db._.relations[tableName]?.table
  if (!isTable(table)) {
    throw new Error(
      `GQLoom-Drizzle Error: Table "${tableName}" not found in drizzle relations`
    )
  }
  return table
}

export * from "./input"
export * from "./resolver"
export * from "./resolver-mysql"
export * from "./resolver-postgres"
export * from "./resolver-sqlite"
export * from "./types"
