import { EasyDataLoader, type ResolverPayload, mapValue } from "@gqloom/core"
import {
  type Column,
  Many,
  type Relation,
  type Table,
  getTableColumns,
  getTableName,
  inArray,
} from "drizzle-orm"
import {
  getPrimaryColumns,
  getSelectedColumns,
  inArrayMultiple,
  paramsAsKey,
} from "../helper"
import type {
  AnyQueryBuilder,
  BaseDatabase,
  QueryToManyFieldOptions,
  QueryToOneFieldOptions,
} from "./types"

export class RelationFieldLoader extends EasyDataLoader<
  [parent: any, arg: any, payload: ResolverPayload | undefined],
  any
> {
  protected isMany: boolean
  protected queryBuilder: AnyQueryBuilder

  public constructor(
    protected db: BaseDatabase,
    protected relationName: string | number | symbol,
    protected relation: Relation<string, string>,
    protected sourceTable: Table,
    protected targetTable: Table
  ) {
    super((...args) => this.batchLoad(...args))
    this.isMany = relation instanceof Many
    const queryBuilder = matchQueryBuilder(this.db.query, this.sourceTable)
    if (!queryBuilder) {
      throw new Error(
        `Query builder not found for source table ${getTableName(this.sourceTable)}`
      )
    }
    this.queryBuilder = queryBuilder
  }

  protected async batchLoad(
    inputs: [
      parent: any,
      args: QueryToOneFieldOptions<any>,
      payload: ResolverPayload | undefined,
    ][]
  ): Promise<any[]> {
    const inputGroups = this.keyByArgs(inputs)
    const resultsGroups = new Map<string, Map<string, any>>()
    await Promise.all(
      Array.from(inputGroups.values()).map(async (inputs) => {
        const args = inputs[0][1]
        const columns = this.columns(inputs)
        const parentResults = this.isMany
          ? await this.loadManyByParent(
              inputs.map((input) => input[0]),
              args,
              columns
            )
          : await this.loadOneByParent(
              inputs.map((input) => input[0]),
              args,
              columns
            )
        const groups = new Map<string, any>(
          parentResults.map((parent: any) => [
            this.getKeyForParent(parent),
            parent,
          ])
        )
        resultsGroups.set(paramsAsKey(args), groups)
      })
    )

    return inputs.map(([parent, args]) => {
      const paramsKey = paramsAsKey(args)
      const groups = resultsGroups.get(paramsKey)
      if (!groups) return null
      const key = this.getKeyForParent(parent)
      const parentResult = groups.get(key)
      return parentResult?.[this.relationName] ?? null
    })
  }

  protected async loadOneByParent(
    parents: any[],
    args: QueryToOneFieldOptions<any>,
    columns: Partial<Record<string, Column>>
  ): Promise<any[]> {
    return await this.queryBuilder.findMany({
      where: { RAW: (table) => this.whereForParent(table, parents) },
      with: {
        [this.relationName]: {
          where: { RAW: args.where },
          columns: mapValue(columns, () => true),
        },
      } as never,
    })
  }

  protected async loadManyByParent(
    parents: any[],
    args: QueryToManyFieldOptions<any>,
    columns: Partial<Record<string, Column>>
  ): Promise<any[]> {
    return await this.queryBuilder.findMany({
      where: { RAW: (table) => this.whereForParent(table, parents) },
      with: {
        [this.relationName]: {
          where: { RAW: args.where },
          orderBy: args.orderBy,
          limit: args.limit,
          offset: args.offset,
          columns: mapValue(columns, () => true),
        },
      } as never,
    })
  }

  protected keyByArgs<TArgs>(
    inputs: [parent: any, args: TArgs, payload: ResolverPayload | undefined][]
  ): Map<
    string,
    [parent: any, args: TArgs, payload: ResolverPayload | undefined][]
  > {
    const inputGroups = new Map<
      string,
      [parent: any, args: TArgs, payload: ResolverPayload | undefined][]
    >()
    for (const input of inputs) {
      const key = paramsAsKey(input[1])
      const array = inputGroups.get(key) ?? []
      array.push(input)
      inputGroups.set(key, array)
    }
    return inputGroups
  }

  protected whereForParent(table: Table, parents: any[]) {
    const primaryColumns = getPrimaryColumns(table)
    if (primaryColumns.length === 1) {
      const [key, column] = primaryColumns[0]
      return inArray(
        column,
        parents.map((parent) => parent[key])
      )
    }
    return inArrayMultiple(
      primaryColumns.map((it) => it[1]),
      parents.map((parent) => primaryColumns.map((it) => parent[it[0]])),
      table
    )
  }

  protected tablesColumnToFieldKey: Map<Table, Map<string, string>> = new Map()

  protected columns(
    inputs: [parent: any, args: any, payload: ResolverPayload | undefined][]
  ) {
    const selectedColumns = getSelectedColumns(
      this.targetTable,
      inputs.map((input) => input[2])
    )

    const referenceColumns = Object.fromEntries(
      this.relation.targetColumns.map((col) => [col.name, col])
    )
    return { ...selectedColumns, ...referenceColumns }
  }

  protected getKeyForParent(parent: any): string {
    return Object.entries(getTableColumns(this.sourceTable))
      .filter(([_, col]) => col.primary)
      .map(([key]) => parent[key])
      .join()
  }
}

function matchQueryBuilder(
  queries: Record<string, any>,
  table: any
): AnyQueryBuilder | undefined {
  for (const qb of Object.values(queries)) {
    if (qb.table != null && qb.table === table) {
      return qb
    }
  }
}
