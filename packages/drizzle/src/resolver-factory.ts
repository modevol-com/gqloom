import type { Table } from "drizzle-orm"

export class DrizzleResolverFactory<TTable extends Table> {
  constructor(public readonly table: TTable) {}

  public selectArrayQuery() {
    return
  }

  public selectSingleQuery() {
    return
  }

  public insertArrayMutation() {
    return
  }

  public insertSingleMutation() {
    return
  }

  public updateMutation() {
    return
  }

  public deleteMutation() {
    return
  }
}
