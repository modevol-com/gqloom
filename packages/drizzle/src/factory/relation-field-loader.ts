import {
  type BaseField,
  LoomDataLoader,
  type ResolverPayload,
  getMemoizationMap,
  mapValue,
} from "@gqloom/core"
import {
  type Column,
  Many,
  type Relation,
  type Table,
  getTableName,
  inArray,
} from "drizzle-orm"
import {
  getParentPath,
  getPrimaryColumns,
  getSelectedColumns,
  inArrayMultiple,
} from "../helper"
import type { AnyQueryBuilder, BaseDatabase } from "./types"

interface RelationFieldsLoaderInput {
  id: number
  selector: RelationFieldSelector
  parent: any
  args: any
  payload: ResolverPayload | undefined
}

export class RelationFieldsLoader extends LoomDataLoader<
  [
    selector: (loader: RelationFieldsLoader) => RelationFieldSelector,
    parent: any,
    args: any,
    payload: ResolverPayload | undefined,
  ],
  any
> {
  public static getLoaderByPath(
    payload: ResolverPayload | undefined,
    ...args: ConstructorParameters<typeof RelationFieldsLoader>
  ): RelationFieldsLoader {
    if (!payload) return new RelationFieldsLoader(...args)
    const memoMap = getMemoizationMap(payload)
    const parentPath = getParentPath(payload.info)
    /** parentPath -> loader */
    const loaderMap: Map<string, RelationFieldsLoader> =
      memoMap.get(RelationFieldsLoader) ?? new Map()
    memoMap.set(RelationFieldsLoader, loaderMap)
    const loader =
      loaderMap.get(parentPath) ?? new RelationFieldsLoader(...args)
    loaderMap.set(parentPath, loader)

    return loader
  }

  protected queryBuilder: AnyQueryBuilder
  protected selectors: Map<Function, RelationFieldSelector>

  public constructor(
    protected db: BaseDatabase,
    protected table: Table
  ) {
    const queryBuilder = matchQueryBuilder(db.query, table)
    if (!queryBuilder) {
      throw new Error(
        `Query builder not found for source table ${getTableName(table)}`
      )
    }
    super()

    this.queryBuilder = queryBuilder
    this.selectors = new Map()
  }

  protected async batchLoad(
    inputBatch: [
      selector: (loader: RelationFieldsLoader) => RelationFieldSelector,
      parent: any,
      args: any,
      payload: ResolverPayload<object, BaseField> | undefined,
    ][]
  ): Promise<any[]> {
    const inputs = inputBatch.map<RelationFieldsLoaderInput>(
      ([selector, ...rest], index) => ({
        id: index,
        parentPath: rest[2]?.info
          ? getParentPath(rest[2]?.info)
          : `isolated:${index}`,
        selector: this.getSelector(selector),
        parent: rest[0],
        args: rest[1],
        payload: rest[2],
      })
    )
    /** field -> inputs */
    const inputGroups = new Map<
      RelationFieldSelector,
      RelationFieldsLoaderInput[]
    >()
    for (const input of inputs) {
      const groupByField = inputGroups.get(input.selector) ?? []
      groupByField.push(input)
      inputGroups.set(input.selector, groupByField)
    }

    const results = await this.loadBatchParents(inputGroups)

    return inputs.map(({ id }) => results.get(id))
  }

  protected async loadBatchParents(
    inputGroups: Map<RelationFieldSelector, RelationFieldsLoaderInput[]>
  ): Promise<Map<number, any>> {
    const { parents, relations } = this.getParentRelation(inputGroups)

    const parentsWithRelationsList = await this.queryBuilder.findMany({
      where: {
        RAW: (table) => whereByParent(table, Array.from(parents.values())),
      },
      with: relations as never,
      columns: Object.fromEntries(
        getPrimaryColumns(this.table).map(([key]) => [key, true])
      ),
    })

    const parentsWithRelations = new Map<string, any>(
      parentsWithRelationsList.map((parent) => [
        keyForParent(this.table, parent),
        parent,
      ])
    )

    /** input.id -> result */
    const results = new Map<number, any>()

    for (const [selector, inputs] of inputGroups) {
      for (const input of inputs) {
        const parent = parentsWithRelations.get(
          keyForParent(this.table, input.parent)
        )
        const result =
          parent?.[selector.relationName] ?? (selector.isMany ? [] : null)
        results.set(input.id, result)
      }
    }

    return results
  }

  protected getParentRelation(
    inputGroups: Map<RelationFieldSelector, RelationFieldsLoaderInput[]>
  ) {
    const parents = new Map<string, any>()
    const relations: any = {}
    for (const [selector, inputs] of inputGroups) {
      const selectedColumns = getSelectedColumns(
        selector.targetTable,
        inputs.map((input) => input.payload)
      )
      const primaryColumns = Object.fromEntries(
        getPrimaryColumns(selector.targetTable)
      )
      const columns = { ...selectedColumns, ...primaryColumns }
      relations[selector.relationName] = selector.selectField(
        inputs[0].args,
        columns
      )
      for (const input of inputs) {
        parents.set(keyForParent(this.table, input.parent), input.parent)
      }
    }
    return { parents, relations }
  }

  protected getSelector(
    selector: (loader: RelationFieldsLoader) => RelationFieldSelector
  ) {
    const existing = this.selectors.get(selector)
    if (existing) return existing
    const selectorInstance = selector(this)
    this.selectors.set(selector, selectorInstance)
    return selectorInstance
  }
}

export class RelationFieldSelector {
  public isMany: boolean

  public constructor(
    public readonly relationName: string | number | symbol,
    relation: Relation<string, string>,
    public readonly targetTable: Table
  ) {
    this.isMany = relation instanceof Many
  }

  public selectField(args: any, columns: Partial<Record<string, Column>>) {
    if (this.isMany) {
      return {
        where: { RAW: args.where },
        orderBy: args.orderBy,
        limit: args.limit,
        offset: args.offset,
        columns: mapValue(columns, () => true),
      }
    }
    return {
      where: { RAW: args.where },
      columns: mapValue(columns, () => true),
    }
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

function keyForParent(table: Table, parent: any) {
  return getPrimaryColumns(table)
    .map(([key]) => parent[key])
    .join()
}

function whereByParent(table: Table, parents: any[]) {
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
    parents.map((parent) => primaryColumns.map(([key]) => parent[key])),
    table
  )
}
