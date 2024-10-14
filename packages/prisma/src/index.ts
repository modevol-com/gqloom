import {
  type GraphQLSilk,
  SYMBOLS,
  silk,
  notNullish,
  weaverContext,
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
  GraphQLEnumType,
} from "graphql"
import type {
  PrismaModelSilk,
  PrismaModelMeta,
  PrismaEnumSilk,
  PrismaWeaverConfig,
} from "./types"

export class PrismaWeaver {
  static unravel<TModal>(
    model: DMMF.Model,
    data: PrismaModelMeta
  ): PrismaModelSilk<TModal> {
    return {
      model,
      data,
      name: model.name,
      [SYMBOLS.GET_GRAPHQL_TYPE]: () =>
        PrismaWeaver.getGraphQLTypeByModel(model, data),
      nullable() {
        return silk.nullable(this as GraphQLSilk)
      },
      list() {
        return silk.list(this) as GraphQLSilk<TModal[]>
      },
    }
  }

  static unravelEnum<TEnum = any>(
    enumType: DMMF.DatamodelEnum
  ): PrismaEnumSilk<TEnum> {
    return {
      enumType,
      [SYMBOLS.GET_GRAPHQL_TYPE]: () =>
        PrismaWeaver.getGraphQLEnumType(enumType),
    }
  }

  static getGraphQLTypeByModel(model: DMMF.Model, data?: PrismaModelMeta) {
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
                  const fieldConfig = PrismaWeaver.getGraphQLField(field, data)
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
    field: DMMF.Field,
    data?: PrismaModelMeta
  ): GraphQLFieldConfig<any, any> | undefined {
    const unwrappedType = (() => {
      switch (field.kind) {
        case "enum": {
          const enumType = data?.enums[field.type]
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

  static getGraphQLTypeByField(
    type: string,
    field?: DMMF.Field
  ): GraphQLOutputType | undefined {
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

  static getGraphQLEnumType(enumType: DMMF.DatamodelEnum): GraphQLEnumType {
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

export * from "./bobbin"
export * from "./types"
export * from "./type-weaver"
