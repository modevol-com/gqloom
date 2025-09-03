import type { MayPromise, StandardSchemaV1 } from "@gqloom/core"
import type { EntityName, FilterQuery } from "@mikro-orm/core"
import type { CountQueryArgs, CountQueryOptions, FilterArgs } from "./type"

export class MikroArgsTransformer<TEntity extends object> {
  public toCountOptions: (
    args: CountQueryArgs<TEntity>
  ) => MayPromise<StandardSchemaV1.Result<CountQueryOptions<TEntity>>>

  public constructor(public readonly entityName: EntityName<TEntity>) {
    this.toCountOptions = (args) => ({
      value: {
        where: this.transformFilters(args.where),
      },
    })
  }

  public transformFilters<TEntity extends object>(
    args: FilterArgs<TEntity> | undefined
  ): FilterQuery<TEntity> | undefined {
    if (!args) {
      return
    }

    const filters: FilterQuery<TEntity> = {}
    for (const key in args) {
      const newKey = key.startsWith("$")
        ? key
        : key === "and"
          ? "$and"
          : key === "or"
            ? "$or"
            : key
      const value = (args as any)[key]
      if (Array.isArray(value)) {
        ;(filters as any)[newKey] = value.map((v) => this.transformFilters(v))
      } else if (typeof value === "object" && value !== null) {
        const subQuery: any = {}
        for (const op in value) {
          subQuery[`$${op}`] = value[op]
        }
        ;(filters as any)[newKey] = subQuery
      } else {
        ;(filters as any)[newKey] = value
      }
    }

    const { $and, $or, ...where } = filters as any
    const result: FilterQuery<TEntity> = where
    if ($and) {
      ;(result as any).$and = $and
    }
    if ($or) {
      ;(result as any).$or = $or
    }
    return result
  }
}
