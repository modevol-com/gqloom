import type { Table } from "drizzle-orm"
import { MySqlAsyncDatabase, type MySqlTable } from "drizzle-orm/mysql-core"
import { PgAsyncDatabase, type PgTable } from "drizzle-orm/pg-core"
import type { SQLiteAsyncDatabase, SQLiteTable } from "drizzle-orm/sqlite-core"
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
      ? (db._.relations[tableOrName]?.table as Table)
      : tableOrName
  if (db instanceof PgAsyncDatabase) {
    return new DrizzlePostgresResolverFactory(db, table as PgTable, options)
  }
  if (db instanceof MySqlAsyncDatabase) {
    return new DrizzleMySQLResolverFactory(db, table as MySqlTable, options)
  }
  return new DrizzleSQLiteResolverFactory(db, table as SQLiteTable, options)
}

export * from "./input"
export * from "./resolver"
export * from "./resolver-mysql"
export * from "./resolver-postgres"
export * from "./resolver-sqlite"
export * from "./types"
