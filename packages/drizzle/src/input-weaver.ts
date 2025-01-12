import type { Table } from "drizzle-orm"

export class DrizzleInputWeaver<TTable extends Table> {
  constructor(public readonly table: TTable) {}

  public insertInput() {
    return
  }

  public updateInput() {
    return
  }

  public filters() {
    return
  }
}
