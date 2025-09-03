import type { EntityName } from "@mikro-orm/core"

export class MikroResolverFactory<TEntity> {
  public constructor(protected readonly entityName: EntityName<TEntity>) {}

  public countQuery() {
    // TODO
  }

  public findQuery() {
    // TODO
  }

  public findAndCountQuery() {
    // TODO
  }

  public findByCursorQuery() {
    // TODO
  }

  public findOneQuery() {
    // TODO
  }

  public findOneOrFailQuery() {
    // TODO
  }

  public assignMutation() {
    // TODO
  }

  public createMutation() {
    // TODO
  }

  public insertMutation() {
    // TODO
  }

  public insertManyMutation() {
    // TODO
  }

  public nativeDeleteMutation() {
    // TODO
  }

  public nativeUpdateMutation() {
    // TODO
  }

  public upsertMutation() {
    // TODO
  }

  public upsertManyMutation() {
    // TODO
  }
}
