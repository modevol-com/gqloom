import {
  type GraphQLSilk,
  isSilk,
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
  PrismaModelConfig,
  PrismaModelConfigOptions,
  PrismaModelConfigOptionsField,
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
      config(
        options: PrismaModelConfigOptions<TModal>
      ): PrismaModelConfig<TModal> {
        return {
          ...options,
          [SYMBOLS.WEAVER_CONFIG]: `gqloom.prisma.model.${model.name}`,
        }
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

    const {
      fields: fieldsGetter,
      [SYMBOLS.WEAVER_CONFIG]: _,
      ...modelConfig
    } = weaverContext.getConfig<PrismaModelConfig<any>>(
      `gqloom.prisma.model.${model.name}`
    ) ?? {}
    const fieldsConfig =
      typeof fieldsGetter === "function" ? fieldsGetter() : fieldsGetter

    return new GraphQLNonNull(
      weaverContext.memoNamedType(
        new GraphQLObjectType({
          name: model.name,
          fields: () =>
            Object.fromEntries(
              model.fields
                .map((field) => {
                  const fieldConfig = PrismaWeaver.getGraphQLField(
                    field,
                    fieldsConfig?.[field.name],
                    meta
                  )
                  return fieldConfig
                    ? ([field.name, fieldConfig] as [
                        string,
                        GraphQLFieldConfig<any, any>,
                      ])
                    : null
                })
                .filter((x) => x != null)
            ),
          ...modelConfig,
        })
      )
    )
  }

  public static getGraphQLField(
    field: DMMF.Field,
    fieldConfig: PrismaModelConfigOptionsField,
    meta: PrismaModelMeta | undefined
  ): GraphQLFieldConfig<any, any> | undefined {
    if (fieldConfig === SYMBOLS.FIELD_HIDDEN) return undefined
    const { type: typeGetter, ...options } = fieldConfig ?? {}
    const fieldTypeFromConfig =
      typeof typeGetter === "function" ? typeGetter() : typeGetter
    if (fieldTypeFromConfig === SYMBOLS.FIELD_HIDDEN) return undefined

    const description = field.documentation

    if (isSilk(fieldTypeFromConfig)) {
      return {
        type: silk.getType(fieldTypeFromConfig),
        description: field.documentation,
        ...options,
      }
    }
    if (fieldTypeFromConfig != null) {
      return {
        type: fieldTypeFromConfig,
        description: field.documentation,
        ...options,
      }
    }

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

    const type = field.isRequired
      ? new GraphQLNonNull(unwrappedType)
      : unwrappedType

    return { type, description, ...options }
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
