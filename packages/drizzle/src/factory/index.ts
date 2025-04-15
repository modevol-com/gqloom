import type { Table } from "drizzle-orm"
import { MySqlDatabase, type MySqlTable } from "drizzle-orm/mysql-core"
import { PgDatabase, type PgTable } from "drizzle-orm/pg-core"
import type { BaseSQLiteDatabase, SQLiteTable } from "drizzle-orm/sqlite-core"
import type { DrizzleFactoryOptionsColumn } from "../types"
import { DrizzleMySQLResolverFactory } from "./resolver-mysql"
import { DrizzlePostgresResolverFactory } from "./resolver-postgres"
import { DrizzleSQLiteResolverFactory } from "./resolver-sqlite"
import type { BaseDatabase } from "./types"

export function drizzleResolverFactory<
  TDatabase extends BaseSQLiteDatabase<any, any, any, any>,
  TTableName extends keyof NonNullable<TDatabase["_"]["schema"]>,
>(
  db: TDatabase,
  tableName: TTableName,
  options?: DrizzleFactoryOptionsColumn<
    NonNullable<TDatabase["_"]["fullSchema"]>[TTableName]
  >
): DrizzleSQLiteResolverFactory<
  TDatabase,
  NonNullable<TDatabase["_"]["fullSchema"]>[TTableName]
>
export function drizzleResolverFactory<
  TDatabase extends BaseSQLiteDatabase<any, any, any, any>,
  TTable extends SQLiteTable,
>(
  db: TDatabase,
  table: TTable,
  options?: DrizzleFactoryOptionsColumn<TTable>
): DrizzleSQLiteResolverFactory<TDatabase, TTable>

export function drizzleResolverFactory<
  TDatabase extends PgDatabase<any, any, any>,
  TTableName extends keyof NonNullable<TDatabase["_"]["schema"]>,
>(
  db: TDatabase,
  tableName: TTableName,
  options?: DrizzleFactoryOptionsColumn<
    NonNullable<TDatabase["_"]["fullSchema"]>[TTableName]
  >
): DrizzlePostgresResolverFactory<
  TDatabase,
  NonNullable<TDatabase["_"]["fullSchema"]>[TTableName]
>
export function drizzleResolverFactory<
  TDatabase extends PgDatabase<any, any, any>,
  TTable extends PgTable,
>(
  db: TDatabase,
  table: TTable,
  options?: DrizzleFactoryOptionsColumn<TTable>
): DrizzlePostgresResolverFactory<TDatabase, TTable>

export function drizzleResolverFactory<
  TDatabase extends MySqlDatabase<any, any, any, any>,
  TTableName extends keyof NonNullable<TDatabase["_"]["schema"]>,
>(
  db: TDatabase,
  tableName: TTableName,
  options?: DrizzleFactoryOptionsColumn<
    NonNullable<TDatabase["_"]["fullSchema"]>[TTableName]
  >
): DrizzleMySQLResolverFactory<
  TDatabase,
  NonNullable<TDatabase["_"]["fullSchema"]>[TTableName]
>
export function drizzleResolverFactory<
  TDatabase extends MySqlDatabase<any, any, any, any>,
  TTable extends MySqlTable,
>(
  db: TDatabase,
  table: TTable,
  options?: DrizzleFactoryOptionsColumn<TTable>
): DrizzleMySQLResolverFactory<TDatabase, TTable>

export function drizzleResolverFactory(
  db: BaseDatabase,
  tableOrName: Table | string
) {
  const table =
    typeof tableOrName === "string"
      ? (db._.fullSchema[tableOrName] as Table)
      : tableOrName
  if (db instanceof PgDatabase) {
    return new DrizzlePostgresResolverFactory(db, table as PgTable)
  }
  if (db instanceof MySqlDatabase) {
    return new DrizzleMySQLResolverFactory(db, table as MySqlTable)
  }
  return new DrizzleSQLiteResolverFactory(db, table as SQLiteTable)
}

export * from "./input"
export * from "./resolver"
export * from "./resolver-mysql"
export * from "./resolver-postgres"
export * from "./resolver-sqlite"
export * from "./types"
