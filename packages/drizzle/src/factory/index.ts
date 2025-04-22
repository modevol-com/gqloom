import type { Table } from "drizzle-orm"
import { MySqlDatabase, type MySqlTable } from "drizzle-orm/mysql-core"
import { PgDatabase, type PgTable } from "drizzle-orm/pg-core"
import type { BaseSQLiteDatabase, SQLiteTable } from "drizzle-orm/sqlite-core"
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
  TDatabase extends BaseSQLiteDatabase<any, any, any, any, any, any>,
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
  TDatabase extends BaseSQLiteDatabase<any, any, any, any, any, any>,
  TTableName extends keyof NonNullable<TDatabase["_"]["schema"]>,
>(
  db: TDatabase,
  tableName: TTableName,
  options?: DrizzleResolverFactoryOptions<
    NonNullable<TDatabase["_"]["fullSchema"]>[TTableName]
  >
): DrizzleSQLiteResolverFactory<
  TDatabase,
  NonNullable<TDatabase["_"]["fullSchema"]>[TTableName]
>

/**
 * Create a resolver factory for PostgreSQL databases.
 *
 * @param db - The PostgreSQL database instance.
 * @param table - The table to create a resolver factory for.
 * @param options - The options for the resolver factory.
 */
export function drizzleResolverFactory<
  TDatabase extends PgDatabase<any, any, any, any, any>,
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
  TDatabase extends MySqlDatabase<any, any, any, any, any, any>,
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
  TDatabase extends PgDatabase<any, any, any, any, any>,
  TTableName extends keyof NonNullable<TDatabase["_"]["schema"]>,
>(
  db: TDatabase,
  tableName: TTableName,
  options?: DrizzleResolverFactoryOptions<
    NonNullable<TDatabase["_"]["fullSchema"]>[TTableName]
  >
): DrizzlePostgresResolverFactory<
  TDatabase,
  NonNullable<TDatabase["_"]["fullSchema"]>[TTableName]
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
  TDatabase extends MySqlDatabase<any, any, any, any, any, any>,
  TTableName extends keyof NonNullable<TDatabase["_"]["schema"]>,
>(
  db: TDatabase,
  tableName: TTableName,
  options?: DrizzleResolverFactoryOptions<
    NonNullable<TDatabase["_"]["fullSchema"]>[TTableName]
  >
): DrizzleMySQLResolverFactory<
  TDatabase,
  NonNullable<TDatabase["_"]["fullSchema"]>[TTableName]
>

export function drizzleResolverFactory(
  db: BaseDatabase,
  tableOrName: Table | string,
  options?: DrizzleResolverFactoryOptions<Table>
) {
  const table =
    typeof tableOrName === "string"
      ? (db._.fullSchema[tableOrName] as Table)
      : tableOrName
  if (db instanceof PgDatabase) {
    return new DrizzlePostgresResolverFactory(db, table as PgTable, options)
  }
  if (db instanceof MySqlDatabase) {
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
