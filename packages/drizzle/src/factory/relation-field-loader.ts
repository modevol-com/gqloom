import { EasyDataLoader, type ResolverPayload } from "@gqloom/core"
import { Many, type Relation, type Table, inArray } from "drizzle-orm"
import { getSelectedColumns, inArrayMultiple } from "../helper"
import type { AnyQueryBuilder, BaseDatabase } from "./types"

export class RelationFieldLoader extends EasyDataLoader<
  [any, payload: ResolverPayload | undefined],
  any
> {
  protected isList: boolean
  protected fieldsLength: number

  public constructor(
    protected db: BaseDatabase,
    protected relation: Relation<string, string>,
    protected queryBuilder: AnyQueryBuilder,
    protected targetTable: Table
  ) {
    super((...args) => this.batchLoad(...args))
    this.isList = relation instanceof Many
    this.fieldsLength = relation.sourceColumns.length
  }

  protected async batchLoad(
    inputs: [any, payload: ResolverPayload | undefined][]
  ) {
    const where = (() => {
      if (this.fieldsLength === 1) {
        const values = inputs.map(
          ([parent]) => parent[this.relation.sourceColumns[0].name]
        )
        return inArray(this.relation.targetColumns[0], values)
      }
      const values = inputs.map((input) =>
        this.relation.sourceColumns.map((field) => input[0][field.name])
      )
      return inArrayMultiple(
        this.relation.targetColumns,
        values,
        this.targetTable
      )
    })()
    const selectedColumns = getSelectedColumns(
      this.targetTable,
      inputs.map((input) => input[1])
    )

    const referenceColumns = Object.fromEntries(
      this.relation.targetColumns.map((col) => [col.name, col])
    )

    const list = await (this.db as any)
      .select({ ...selectedColumns, ...referenceColumns })
      .from(this.targetTable)
      .where(where)

    const groups = new Map<string, any>()
    for (const item of list) {
      const key = this.getKeyByReference(item)
      this.isList
        ? groups.set(key, [...(groups.get(key) ?? []), item])
        : groups.set(key, item)
    }
    return inputs.map(([parent]) => {
      const key = this.getKeyByField(parent)
      return groups.get(key) ?? (this.isList ? [] : null)
    })
  }

  protected getKeyByField(parent: any) {
    if (this.fieldsLength === 1) {
      return parent[this.relation.sourceColumns[0].name]
    }
    return this.relation.sourceColumns
      .map((field) => parent[field.name])
      .join("-")
  }

  protected getKeyByReference(item: any) {
    if (this.fieldsLength === 1) {
      return item[this.relation.targetColumns[0].name]
    }
    return this.relation.targetColumns
      .map((reference) => item[reference.name])
      .join("-")
  }
}
