import {
  type GraphQLSilk,
  mapValue,
  pascalCase,
  silk,
  weaverContext,
} from "@gqloom/core"
import {
  type EntityMetadata,
  type EntityName,
  EntitySchema,
  type FilterQuery,
  QueryOrder,
} from "@mikro-orm/core"
import {
  GraphQLEnumType,
  type GraphQLFieldConfig,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLString,
} from "graphql"
import { MikroWeaver } from ".."
import type {
  CountQueryArgs,
  CountQueryOptions,
  FilterArgs,
  FindByCursorQueryArgs,
  FindByCursorQueryOptions,
  FindOneQueryArgs,
  FindOneQueryOptions,
  FindQueryArgs,
  FindQueryOptions,
  MikroFactoryPropertyBehaviors,
  MikroResolverFactoryOptions,
} from "./type"

export class MikroInputFactory<TEntity extends object> {
  public constructor(
    protected readonly entityName: EntityName<TEntity>,
    protected readonly options?: Partial<MikroResolverFactoryOptions<TEntity>>
  ) {}

  protected get meta(): EntityMetadata {
    if (this.entityName instanceof EntitySchema) {
      return this.entityName.init().meta
    }
    if (!this.options?.metadata) throw new Error("Metadata not found")
    return this.options.metadata.get(this.entityName)
  }

  protected get metaName(): string {
    return this.meta.name ?? this.meta.className
  }

  public filter(): GraphQLObjectType {
    const name = `${this.metaName}Filter`

    return (
      weaverContext.getNamedType(name) ??
      weaverContext.memoNamedType(
        new GraphQLObjectType({
          name,
          fields: () =>
            mapValue(this.meta.properties, (property, propertyName) => {
              // Check visibility for filters
              if (
                !MikroInputFactory.isPropertyVisible(
                  propertyName,
                  this.options?.input,
                  "filters"
                )
              ) {
                return mapValue.SKIP
              }

              const type = MikroWeaver.getFieldType(property, this.meta)
              if (type == null) return mapValue.SKIP
              return {
                type:
                  type instanceof GraphQLScalarType
                    ? MikroInputFactory.comparisonOperatorsType(type)
                    : type,
                description: property.comment,
              } as GraphQLFieldConfig<any, any>
            }),
        })
      )
    )
  }

  public countArgs() {
    const name = `${pascalCase(this.metaName)}CountArgs`
    const existing = weaverContext.getNamedType(name) as GraphQLObjectType
    if (existing != null) return existing
    return weaverContext.memoNamedType(
      new GraphQLObjectType<CountQueryArgs<TEntity>>({
        name,
        fields: {
          where: { type: this.filter() },
        },
      })
    )
  }

  public countArgsSilk() {
    return silk<CountQueryOptions<TEntity>, CountQueryArgs<TEntity>>(
      () => this.countArgs(),
      (args) => ({
        value: {
          where: this.transformFilters(args.where),
        },
      })
    )
  }

  public findArgs() {
    const name = `${pascalCase(this.metaName)}FindArgs`
    const existing = weaverContext.getNamedType(name) as GraphQLObjectType
    if (existing != null) return existing
    return weaverContext.memoNamedType(
      new GraphQLObjectType<FindQueryArgs<TEntity>>({
        name,
        fields: {
          where: { type: this.filter() },
          orderBy: { type: this.orderBy() },
          limit: { type: GraphQLInt },
          offset: { type: GraphQLInt },
        },
      })
    )
  }

  public findArgsSilk() {
    return silk<FindQueryOptions<TEntity>, FindQueryArgs<TEntity>>(
      () => this.findArgs(),
      (args) => ({
        value: {
          where: this.transformFilters(args.where),
          orderBy: args.orderBy,
          limit: args.limit,
          offset: args.offset,
        },
      })
    )
  }

  public findByCursorArgs() {
    const name = `${pascalCase(this.metaName)}FindByCursorArgs`
    const existing = weaverContext.getNamedType(name) as GraphQLObjectType
    if (existing != null) return existing
    return weaverContext.memoNamedType(
      new GraphQLObjectType<FindByCursorQueryArgs<TEntity>>({
        name,
        fields: {
          where: { type: this.filter() },
          orderBy: { type: this.orderBy() },
          after: { type: GraphQLString },
          before: { type: GraphQLString },
          first: { type: GraphQLInt },
          last: { type: GraphQLInt },
        },
      })
    )
  }

  public findByCursorArgsSilk() {
    return silk<
      FindByCursorQueryOptions<TEntity>,
      FindByCursorQueryArgs<TEntity>
    >(
      () => this.findByCursorArgs(),
      (args) => ({
        value: {
          where: this.transformFilters(args.where),
          orderBy: args.orderBy,
          after: args.after,
          before: args.before,
          first: args.first,
          last: args.last,
        },
      })
    )
  }

  public findOneArgs() {
    const name = `${pascalCase(this.metaName)}FindOneArgs`
    const existing = weaverContext.getNamedType(name) as GraphQLObjectType
    if (existing != null) return existing
    return weaverContext.memoNamedType(
      new GraphQLObjectType<FindOneQueryArgs<TEntity>>({
        name,
        fields: {
          where: { type: this.filter() },
          orderBy: { type: this.orderBy() },
          offset: { type: GraphQLInt },
        },
      })
    )
  }

  public findOneArgsSilk() {
    return silk<FindOneQueryOptions<TEntity>, FindOneQueryArgs<TEntity>>(
      () => this.findOneArgs(),
      (args) => ({
        value: {
          where: this.transformFilters(args.where),
          orderBy: args.orderBy,
          offset: args.offset,
        },
      })
    )
  }

  public orderBy(): GraphQLObjectType {
    const name = `${this.metaName}OrderBy`
    return (
      weaverContext.getNamedType(name) ??
      weaverContext.memoNamedType(
        new GraphQLObjectType({
          name,
          fields: () =>
            mapValue(this.meta.properties, (property, propertyName) => {
              // Check visibility for filters (ordering is typically tied to filtering)
              if (
                !MikroInputFactory.isPropertyVisible(
                  propertyName,
                  this.options?.input,
                  "filters"
                )
              ) {
                return mapValue.SKIP
              }

              const type = MikroWeaver.getFieldType(property, this.meta)
              if (type == null) return mapValue.SKIP
              return {
                type: MikroInputFactory.queryOrderType(),
                description: property.comment,
              } as GraphQLFieldConfig<any, any>
            }),
        })
      )
    )
  }

  protected transformFilters(
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

  public static comparisonOperatorsType<TScalarType extends GraphQLScalarType>(
    type: TScalarType
  ): GraphQLObjectType {
    // https://mikro-orm.io/docs/query-conditions#comparison
    const name = `${type.name}MikroComparisonOperators`

    return (
      weaverContext.getNamedType(name) ??
      weaverContext.memoNamedType(
        new GraphQLObjectType({
          name,
          fields: {
            eq: {
              type,
              description:
                "Equals. Matches values that are equal to a specified value.",
            },
            gt: {
              type,
              description:
                "Greater. Matches values that are greater than a specified value.",
            },
            gte: {
              type,
              description:
                "Greater or Equal. Matches values that are greater than or equal to a specified value.",
            },
            in: {
              type: new GraphQLList(new GraphQLNonNull(type)),
              description:
                "Contains, Contains, Matches any of the values specified in an array.",
            },
            lt: {
              type,
              description:
                "Lower, Matches values that are less than a specified value.",
            },
            lte: {
              type,
              description:
                "Lower or equal, Matches values that are less than or equal to a specified value.",
            },
            ne: {
              type,
              description:
                "Not equal. Matches all values that are not equal to a specified value.",
            },
            nin: {
              type: new GraphQLList(new GraphQLNonNull(type)),
              description:
                "Not contains. Matches none of the values specified in an array.",
            },
            overlap: {
              type: new GraphQLList(new GraphQLNonNull(type)),
              description: "&&",
            },
            contains: {
              type: new GraphQLList(new GraphQLNonNull(type)),
              description: "@>",
            },
            contained: {
              type: new GraphQLList(new GraphQLNonNull(type)),
              description: "<@",
            },
            ...(type === GraphQLString
              ? {
                  like: {
                    type,
                    description: "Like. Uses LIKE operator",
                  },
                  re: {
                    type,
                    description: "Regexp. Uses REGEXP operator",
                  },
                  fulltext: {
                    type,
                    description:
                      "Full text.	A driver specific full text search function.",
                  },
                  ilike: {
                    type,
                    description: "ilike",
                  },
                }
              : {}),
          },
        })
      )
    )
  }

  public static queryOrderType(): GraphQLEnumType {
    const name = `MikroQueryOrder`

    return (
      weaverContext.getNamedType(name) ??
      weaverContext.memoNamedType(
        new GraphQLEnumType({
          name,
          values: {
            ASC: { value: QueryOrder.ASC },
            ASC_NULLS_LAST: { value: QueryOrder.ASC_NULLS_LAST },
            ASC_NULLS_FIRST: { value: QueryOrder.ASC_NULLS_FIRST },
            DESC: { value: QueryOrder.DESC },
            DESC_NULLS_LAST: { value: QueryOrder.DESC_NULLS_LAST },
            DESC_NULLS_FIRST: { value: QueryOrder.DESC_NULLS_FIRST },
          },
        })
      )
    )
  }

  public static isPropertyVisible(
    propertyName: string,
    behaviors: MikroFactoryPropertyBehaviors<any> | undefined,
    operation: "filters" | "create" | "update"
  ): boolean {
    if (!behaviors) return true

    const behavior = behaviors[propertyName]
    const defaultBehavior = behaviors["*"]

    // Direct boolean value
    if (typeof behavior === "boolean") return behavior

    // GraphQLSilk (has ~standard property)
    if (behavior && typeof behavior === "object" && "~standard" in behavior) {
      return true
    }

    // PropertyBehavior object
    if (typeof behavior === "object") {
      const operationConfig = behavior[operation]
      if (typeof operationConfig === "boolean") return operationConfig
      if (
        operationConfig &&
        typeof operationConfig === "object" &&
        "~standard" in operationConfig
      )
        return true
    }

    // Check default behavior
    if (typeof defaultBehavior === "boolean") return defaultBehavior

    if (typeof defaultBehavior === "object") {
      const operationConfig = defaultBehavior[operation]
      if (typeof operationConfig === "boolean") return operationConfig
    }

    return true
  }

  public static getPropertyConfig<TEntity>(
    behaviors: MikroFactoryPropertyBehaviors<TEntity> | undefined,
    propertyName: keyof TEntity,
    operation: "create" | "update"
  ): GraphQLSilk<any, any> | undefined {
    if (!behaviors) return undefined

    const behavior = behaviors[propertyName]

    // Direct GraphQLSilk
    if (behavior && typeof behavior === "object" && "~standard" in behavior) {
      return behavior as GraphQLSilk<any, any>
    }

    // PropertyBehavior object with operation-specific silk
    if (typeof behavior === "object") {
      const operationConfig = behavior[operation]
      if (
        operationConfig &&
        typeof operationConfig === "object" &&
        "~standard" in operationConfig
      ) {
        return operationConfig as GraphQLSilk<any, any>
      }
    }

    return undefined
  }
}
