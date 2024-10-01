import {
  type GraphQLSilk,
  SYMBOLS,
  silk,
  notNullish,
  weaverContext,
  type WeaverConfig,
} from "@gqloom/core"
import { type DMMF } from "@prisma/generator-helper"
import {
  type GraphQLFieldConfig,
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLBoolean,
  GraphQLInt,
  GraphQLFloat,
  GraphQLNonNull,
  type GraphQLOutputType,
} from "graphql"

export class PrismaWeaver {
  static unravel<TModal>(model: DMMF.Model): PrismaModelSilk<TModal> {
    return {
      [SYMBOLS.GET_GRAPHQL_TYPE]: () =>
        PrismaWeaver.getGraphQLTypeByModel(model),
      nullable() {
        return silk.nullable(this as GraphQLSilk)
      },
      list() {
        return silk.list(this) as GraphQLSilk<TModal[]>
      },
    }
  }

  static getGraphQLTypeByModel(model: DMMF.Model) {
    const existing = weaverContext.getNamedType(model.name)
    if (existing != null) return new GraphQLNonNull(existing)

    return new GraphQLNonNull(
      weaverContext.memoNamedType(
        new GraphQLObjectType({
          name: model.name,
          fields: () =>
            Object.fromEntries(
              model.fields
                .map((field) => {
                  const fieldConfig = PrismaWeaver.getGraphQLField(field)
                  return fieldConfig
                    ? ([field.name, fieldConfig] as [
                        string,
                        GraphQLFieldConfig<any, any>,
                      ])
                    : null
                })
                .filter(notNullish)
            ),
        })
      )
    )
  }

  static getGraphQLField(
    field: DMMF.Field
  ): GraphQLFieldConfig<any, any> | undefined {
    if (field.kind !== "scalar") return

    const description = field.documentation
    const unwrappedType = PrismaWeaver.getGraphQLTypeByField(field)

    if (!unwrappedType) return

    const type = field.isRequired
      ? new GraphQLNonNull(unwrappedType)
      : unwrappedType

    return { type, description }
  }

  static getGraphQLTypeByField(
    field: DMMF.Field
  ): GraphQLOutputType | undefined {
    const config = weaverContext.getConfig<PrismaWeaverConfig>("gqloom.prisma")

    if (field.kind !== "scalar") return

    const presetType = config?.presetGraphQLType?.(field)
    if (presetType) return presetType
    if (field.isId) return GraphQLID
    switch (field.type) {
      case "BigInt":
      case "Int":
        return GraphQLInt
      case "Decimal":
      case "Float":
        return GraphQLFloat
      case "Boolean":
        return GraphQLBoolean
      case "DateTime":
      case "String":
        return GraphQLString
      default:
        throw new Error(`Unsupported scalar type: ${field.type}`)
    }
  }
}

export interface PrismaModelSilk<TModel> extends GraphQLSilk<TModel> {
  nullable(): GraphQLSilk<TModel | null>
  list(): GraphQLSilk<TModel[]>
}

export interface PrismaWeaverConfigOptions {
  presetGraphQLType?: (field: DMMF.Field) => GraphQLOutputType | undefined
}

export interface PrismaWeaverConfig
  extends WeaverConfig,
    PrismaWeaverConfigOptions {
  [SYMBOLS.WEAVER_CONFIG]: "gqloom.prisma"
}
