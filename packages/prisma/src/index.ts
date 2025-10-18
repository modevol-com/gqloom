import {
  type GraphQLSilk,
  notNullish,
  SYMBOLS,
  silk,
  weaverContext,
} from "@gqloom/core"
import type { DMMF } from "@prisma/generator-helper"
import {
  GraphQLBoolean,
  GraphQLEnumType,
  type GraphQLFieldConfig,
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLObjectType,
  type GraphQLOutputType,
  GraphQLString,
} from "graphql"
import type {
  PrismaEnumSilk,
  PrismaModelMeta,
  PrismaModelSilk,
  PrismaWeaverConfig,
  PrismaWeaverConfigOptions,
  SelectiveModel,
} from "./types"

export class PrismaWeaver {
  public static vendor = "gqloom.prisma"

  public static unravel<TModal>(
    model: DMMF.Model,
    meta: PrismaModelMeta
  ): PrismaModelSilk<TModal> {
    return {
      "~standard": {
        version: 1,
        vendor: PrismaWeaver.vendor,
        validate: (value) => ({
          value: value as SelectiveModel<TModal, typeof model.name>,
        }),
      },
      model,
      meta,
      name: model.name,
      [SYMBOLS.GET_GRAPHQL_TYPE]: () =>
        PrismaWeaver.getGraphQLTypeByModel(model, meta),
      nullable() {
        return silk.nullable(this as GraphQLSilk)
      },
      list() {
        return silk.list(this) as GraphQLSilk<
          SelectiveModel<TModal, typeof model.name>[]
        >
      },
    }
  }

  public static unravelEnum<TEnum = any>(
    enumType: DMMF.DatamodelEnum
  ): PrismaEnumSilk<TEnum> {
    return {
      "~standard": {
        version: 1,
        vendor: PrismaWeaver.vendor,
        validate: (value) => ({ value: value as TEnum }),
      },
      enumType,
      [SYMBOLS.GET_GRAPHQL_TYPE]: () =>
        PrismaWeaver.getGraphQLEnumType(enumType),
    }
  }

  public static getGraphQLTypeByModel(
    model: DMMF.Model,
    meta?: PrismaModelMeta
  ) {
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
                  const fieldConfig = PrismaWeaver.getGraphQLField(field, meta)
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

  public static getGraphQLField(
    field: DMMF.Field,
    meta?: PrismaModelMeta
  ): GraphQLFieldConfig<any, any> | undefined {
    const unwrappedType = (() => {
      switch (field.kind) {
        case "enum": {
          const enumType = meta?.enums[field.type]
          if (enumType == null) return
          return PrismaWeaver.getGraphQLEnumType(enumType)
        }
        case "scalar":
          return PrismaWeaver.getGraphQLTypeByField(field.type, field)
      }
    })()
    if (!unwrappedType) return

    const description = field.documentation

    const type = field.isRequired
      ? new GraphQLNonNull(unwrappedType)
      : unwrappedType

    return { type, description }
  }

  public static config(config: PrismaWeaverConfigOptions): PrismaWeaverConfig {
    return {
      ...config,
      [SYMBOLS.WEAVER_CONFIG]: "gqloom.prisma",
    }
  }

  public static getGraphQLTypeByField(
    type: string,
    field?: DMMF.Field
  ): GraphQLOutputType {
    const config = weaverContext.getConfig<PrismaWeaverConfig>("gqloom.prisma")

    const presetType = config?.presetGraphQLType?.(type, field)
    if (presetType) return presetType
    if (field?.isId) return GraphQLID
    switch (type) {
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
        throw new Error(`Unsupported scalar type: ${type}`)
    }
  }

  public static getGraphQLEnumType(
    enumType: DMMF.DatamodelEnum
  ): GraphQLEnumType {
    const existing = weaverContext.getNamedType(
      enumType.name
    ) as GraphQLEnumType
    if (existing != null) return existing

    return weaverContext.memoNamedType(
      new GraphQLEnumType({
        name: enumType.name,
        values: Object.fromEntries(
          enumType.values.map((it) => [it.name, { value: it.name }])
        ),
      })
    )
  }
}

export * from "./resolver-factory"
export * from "./type-factory"
export * from "./types"
