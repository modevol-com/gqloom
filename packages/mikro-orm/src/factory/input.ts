import {
  type GraphQLSilk,
  mapValue,
  pascalCase,
  weaverContext,
} from "@gqloom/core"
import {
  type EntityMetadata,
  type EntityName,
  EntitySchema,
} from "@mikro-orm/core"
import {
  type GraphQLFieldConfig,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLString,
} from "graphql"
import { MikroWeaver } from ".."
import type {
  CountArgs,
  MikroFactoryPropertyBehaviors,
  MikroResolverFactoryOptions,
} from "./type"

export class MikroInputFactory<TEntity extends object> {
  public constructor(
    protected readonly entityName: EntityName<TEntity>,
    protected readonly options?: MikroResolverFactoryOptions<TEntity>
  ) {}

  protected get meta(): EntityMetadata {
    if (this.entityName instanceof EntitySchema) {
      return this.entityName.init().meta
    }
    throw new Error("EntityName must be an EntitySchema") // FIXME
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
      new GraphQLObjectType<CountArgs<TEntity>>({
        name,
        fields: {
          where: { type: this.filter() },
        },
      })
    )
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
