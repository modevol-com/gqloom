import type { StandardSchemaV1 } from "@gqloom/core"
import {
  type Column,
  type SQL,
  type Table,
  and,
  asc,
  desc,
  eq,
  getTableColumns,
  getTableName,
  gt,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  like,
  lt,
  lte,
  ne,
  not,
  notIlike,
  notInArray,
  notLike,
  or,
} from "drizzle-orm"
import type {
  ColumnFilters,
  CountArgs,
  DeleteArgs,
  Filters,
  FiltersCore,
  InsertArrayArgs,
  InsertArrayWithOnConflictArgs,
  InsertSingleArgs,
  InsertSingleWithOnConflictArgs,
  RelationToManyArgs,
  RelationToOneArgs,
  SelectArrayArgs,
  SelectSingleArgs,
  UpdateArgs,
} from "./input"
import type {
  CountOptions,
  DeleteOptions,
  InsertArrayOptions,
  InsertArrayWithOnConflictOptions,
  InsertSingleOptions,
  InsertSingleWithOnConflictOptions,
  QueryToManyFieldOptions,
  QueryToOneFieldOptions,
  SelectArrayOptions,
  SelectSingleOptions,
  UpdateOptions,
} from "./types"

export class DrizzleArgsTransformer<TTable extends Table> {
  public toSelectArrayOptions: (
    args: SelectArrayArgs<TTable>
  ) => StandardSchemaV1.Result<SelectArrayOptions>

  public toSelectSingleOptions: (
    args: SelectSingleArgs<TTable>
  ) => StandardSchemaV1.Result<SelectSingleOptions>

  public toCountOptions: (
    args: CountArgs<TTable>
  ) => StandardSchemaV1.Result<CountOptions>

  public toQueryToManyFieldOptions: (
    args: RelationToManyArgs<TTable>
  ) => StandardSchemaV1.Result<QueryToManyFieldOptions<TTable>>

  public toQueryToOneFieldOptions: (
    args: RelationToOneArgs<TTable>
  ) => StandardSchemaV1.Result<QueryToOneFieldOptions<TTable>>

  public toInsertArrayOptions: (
    args: InsertArrayArgs<TTable>
  ) => StandardSchemaV1.Result<InsertArrayOptions<TTable>>

  public toInsertArrayWithOnConflictOptions: (
    args: InsertArrayWithOnConflictArgs<TTable>
  ) => StandardSchemaV1.Result<InsertArrayWithOnConflictOptions<TTable>>

  public toInsertSingleOptions: (
    args: InsertSingleArgs<TTable>
  ) => StandardSchemaV1.Result<InsertSingleOptions<TTable>>

  public toInsertSingleWithOnConflictOptions: (
    args: InsertSingleWithOnConflictArgs<TTable>
  ) => StandardSchemaV1.Result<InsertSingleWithOnConflictOptions<TTable>>

  public toUpdateOptions: (
    args: UpdateArgs<TTable>
  ) => StandardSchemaV1.Result<UpdateOptions<TTable>>

  public toDeleteOptions: (
    args: DeleteArgs<TTable>
  ) => StandardSchemaV1.Result<DeleteOptions>

  public constructor(protected readonly table: TTable) {
    this.toSelectArrayOptions = (args) => ({
      value: {
        where: this.extractFilters(args.where),
        orderBy: this.extractOrderBy(args.orderBy),
        limit: args.limit,
        offset: args.offset,
      },
    })

    this.toSelectSingleOptions = (args) => ({
      value: {
        where: this.extractFilters(args.where),
        orderBy: this.extractOrderBy(args.orderBy),
        offset: args.offset,
      },
    })

    this.toCountOptions = (args) => ({
      value: { where: this.extractFilters(args.where) },
    })

    this.toQueryToManyFieldOptions = (args) => ({
      value: {
        where: this.extractFilters(args.where),
        orderBy: args.orderBy,
        limit: args.limit,
        offset: args.offset,
      },
    })

    this.toQueryToOneFieldOptions = (args) => ({
      value: {
        where: this.extractFilters(args.where),
      },
    })
    this.toInsertArrayOptions = (args) => ({ value: { values: args.values } })

    this.toInsertArrayWithOnConflictOptions = (args) => ({
      value: {
        values: args.values,
        onConflictDoNothing: args.onConflictDoNothing
          ? {
              target: args.onConflictDoNothing.target?.map((t) =>
                this.toColumn(t)
              ),
              where: this.extractFilters(args.onConflictDoNothing?.where),
            }
          : undefined,
        onConflictDoUpdate: args.onConflictDoUpdate
          ? {
              target: args.onConflictDoUpdate.target.map((t) =>
                this.toColumn(t)
              ),
              set: args.onConflictDoUpdate.set,
              targetWhere: this.extractFilters(
                args.onConflictDoUpdate?.targetWhere
              ),
              setWhere: this.extractFilters(args.onConflictDoUpdate?.setWhere),
            }
          : undefined,
      },
    })

    this.toInsertSingleOptions = (args) => ({
      value: { value: args.value },
    })

    this.toInsertSingleWithOnConflictOptions = (args) => ({
      value: {
        value: args.value,
        onConflictDoNothing: args.onConflictDoNothing
          ? {
              target: args.onConflictDoNothing.target?.map((t) =>
                this.toColumn(t)
              ),
              where: this.extractFilters(args.onConflictDoNothing?.where),
            }
          : undefined,
        onConflictDoUpdate: args.onConflictDoUpdate
          ? {
              target: args.onConflictDoUpdate.target.map((t) =>
                this.toColumn(t)
              ),
              set: args.onConflictDoUpdate.set,
              targetWhere: this.extractFilters(
                args.onConflictDoUpdate?.targetWhere
              ),
              setWhere: this.extractFilters(args.onConflictDoUpdate?.setWhere),
            }
          : undefined,
      },
    })

    this.toUpdateOptions = (args) => ({
      value: {
        where: this.extractFilters(args.where),
        set: args.set,
      },
    })

    this.toDeleteOptions = (args) => ({
      value: { where: this.extractFilters(args.where) },
    })
  }

  protected toColumn(columnName: string) {
    const column = getTableColumns(this.table)[columnName]
    if (!column) {
      throw new Error(
        `Column ${columnName} not found in table ${getTableName(this.table)}`
      )
    }
    return column
  }

  public extractFilters(
    filters: Filters<any> | undefined,
    table?: any
  ): SQL | undefined {
    if (filters == null) return
    table ??= this.table

    const entries = Object.entries(filters as FiltersCore<TTable>)
    const variants: (SQL | undefined)[] = []

    for (const [columnName, operators] of entries) {
      if (operators == null) continue

      if (columnName === "OR" && Array.isArray(operators)) {
        const orConditions: SQL[] = []
        for (const variant of operators) {
          const extracted = this.extractFilters(variant, table)
          if (extracted) orConditions.push(extracted)
        }
        if (orConditions.length > 0) {
          variants.push(or(...orConditions))
        }
        continue
      }

      if (columnName === "AND" && Array.isArray(operators)) {
        const andConditions: SQL[] = []
        for (const variant of operators) {
          const extracted = this.extractFilters(variant, table)
          if (extracted) andConditions.push(extracted)
        }
        if (andConditions.length > 0) {
          variants.push(and(...andConditions))
        }
        continue
      }

      if (columnName === "NOT" && operators) {
        const extracted = this.extractFilters(operators, table)
        if (extracted) {
          variants.push(not(extracted))
        }
        continue
      }

      const column = getTableColumns(table)[columnName]!
      const extractedColumn = this.extractFiltersColumn(
        column,
        columnName,
        operators,
        table
      )
      if (extractedColumn) variants.push(extractedColumn)
    }

    return and(...variants)
  }

  public extractFiltersColumn<TColumn extends Column>(
    column: TColumn,
    columnName: string,
    operators: ColumnFilters<TColumn["_"]["data"]>,
    table?: any
  ): SQL | undefined {
    const entries = Object.entries(operators)

    const variants: (SQL | undefined)[] = []
    const binaryOperators = { eq, ne, gt, gte, lt, lte }
    const textOperators = { like, notLike, ilike, notIlike }
    const arrayOperators = { in: inArray, notIn: notInArray }
    const nullOperators = { isNull, isNotNull }

    const tableColumn = table ? table[columnName] : column

    if (operators.OR) {
      const orVariants = [] as SQL[]

      for (const variant of operators.OR) {
        const extracted = this.extractFiltersColumn(
          column,
          columnName,
          variant,
          table
        )

        if (extracted) orVariants.push(extracted)
      }

      variants.push(or(...orVariants))
    }

    if (operators.AND) {
      const andVariants = [] as SQL[]

      for (const variant of operators.AND) {
        const extracted = this.extractFiltersColumn(
          column,
          columnName,
          variant,
          table
        )

        if (extracted) andVariants.push(extracted)
      }

      variants.push(and(...andVariants))
    }

    if (operators.NOT) {
      const extracted = this.extractFiltersColumn(
        column,
        columnName,
        operators.NOT,
        table
      )
      if (extracted) {
        variants.push(not(extracted))
      }
    }

    for (const [operatorName, operatorValue] of entries) {
      if (operatorValue === null || operatorValue === false) continue

      if (operatorName in binaryOperators) {
        const operator =
          binaryOperators[operatorName as keyof typeof binaryOperators]
        variants.push(operator(tableColumn, operatorValue))
      } else if (operatorName in textOperators) {
        const operator =
          textOperators[operatorName as keyof typeof textOperators]
        variants.push(operator(tableColumn, operatorValue))
      } else if (operatorName in arrayOperators) {
        const operator =
          arrayOperators[operatorName as keyof typeof arrayOperators]
        variants.push(operator(tableColumn, operatorValue))
      } else if (operatorName in nullOperators) {
        const operator =
          nullOperators[operatorName as keyof typeof nullOperators]
        if (operatorValue === true) variants.push(operator(tableColumn))
      }
    }

    return and(...variants)
  }

  protected extractOrderBy(
    orders?: SelectArrayArgs<TTable>["orderBy"]
  ): SQL[] | undefined {
    if (orders == null) return
    const answer: SQL[] = []
    const columns = getTableColumns(this.table)
    for (const [column, direction] of Object.entries(orders)) {
      if (!direction) continue
      if (column in columns) {
        answer.push(
          direction === "asc" ? asc(columns[column]) : desc(columns[column])
        )
      }
    }
    return answer
  }
}
