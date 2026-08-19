import {
  type GraphQLSilk,
  isSilk,
  type StandardSchemaV1,
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
  isNonNullType,
  isOutputType,
} from "graphql"
import type {
  Getter,
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
    const standard = {
      version: 1,
      vendor: PrismaWeaver.vendor,
      validate: PrismaWeaver.compileValidator(undefined),
    }
    return {
      "~standard": standard as StandardSchemaV1.Props<
        unknown,
        SelectiveModel<TModal, typeof model.name>
      >,
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
        standard.validate = PrismaWeaver.compileValidator(options)
        return {
          ...options,
          [SYMBOLS.WEAVER_CONFIG]: `gqloom.prisma.model.${model.name}`,
        }
      },
    }
  }

  /**
   * Compile a validate function from config.fields: each field with a Silk
   * (~standard.validate) is validated; issues get path prefixed with the field key.
   * When config is provided, validators are closed over (no weaverContext at validate-time).
   */
  protected static compileValidator(
    config?: PrismaModelConfigOptions<any>
  ): StandardSchemaV1.Props<unknown, unknown>["validate"] {
    const rawFields =
      config?.fields == null
        ? undefined
        : typeof config.fields === "function"
          ? config.fields()
          : config.fields

    if (rawFields == null || typeof rawFields !== "object") {
      return (value: unknown) => ({ value })
    }

    const validators = new Map<string, (v: unknown) => any>()
    for (const key of Object.keys(rawFields)) {
      const fn = PrismaWeaver.getFieldValidateFn(
        (rawFields as Record<string, PrismaModelConfigOptionsField>)[key]
      )
      if (fn) validators.set(key, fn)
    }

    if (validators.size === 0) {
      return (value: unknown) => ({ value })
    }

    return async (value: unknown) => {
      if (value == null || typeof value !== "object") return { value }
      const valueObj = value as Record<string, unknown>
      const entries = Array.from(validators.entries()).filter(
        ([key]) => key in valueObj
      )
      if (entries.length === 0) return { value: valueObj }

      const results = await Promise.all(
        entries.map(async ([key, validateFn]) => {
          const fieldResult = await validateFn(valueObj[key])
          return { key, fieldResult }
        })
      )

      const result = { ...valueObj }
      const issues: StandardSchemaV1.Issue[] = []
      for (const { key, fieldResult } of results) {
        if (fieldResult.issues) {
          for (const issue of fieldResult.issues as StandardSchemaV1.Issue[]) {
            issues.push({ ...issue, path: [key, ...(issue.path ?? [])] })
          }
        } else if ("value" in fieldResult) {
          result[key] = fieldResult.value
        }
      }
      if (issues.length > 0) return { issues }
      return { value: result }
    }
  }

  /** Extract validate from a field config (Silk) if it has ~standard.validate. */
  protected static getFieldValidateFn(
    fieldConfig: PrismaModelConfigOptionsField
  ): ((v: unknown) => any) | null {
    if (fieldConfig == null || fieldConfig === SYMBOLS.FIELD_HIDDEN) return null
    if (isSilk(fieldConfig)) {
      const validate = (fieldConfig as GraphQLSilk<unknown, unknown>)[
        "~standard"
      ]?.validate
      return typeof validate === "function" ? validate : null
    }
    if (isOutputType(fieldConfig)) return null
    const rawType =
      typeof (fieldConfig as { type?: unknown }).type === "function"
        ? ((fieldConfig as { type: () => unknown }).type as () => unknown)()
        : (fieldConfig as { type?: unknown }).type
    if (rawType == null || !isSilk(rawType)) return null
    const validate = (rawType as GraphQLSilk<unknown, unknown>)["~standard"]
      ?.validate
    return typeof validate === "function" ? validate : null
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
    const [typeGetter, options] =
      PrismaWeaver.getFieldConfigOptions(fieldConfig)

    /** Align output nullability with Model: required → NonNull, optional → nullable */
    const applyModelNullability = (
      type: GraphQLOutputType
    ): GraphQLOutputType => {
      const ofType = isNonNullType(type) ? type.ofType : type
      return field.isRequired ? new GraphQLNonNull(ofType) : ofType
    }
    const description = field.documentation

    const unwrappedType = (() => {
      switch (field.kind) {
        case "enum": {
          const enumType = meta?.enums[field.type]
          if (enumType == null) return
          return PrismaWeaver.getGraphQLEnumType(enumType)
        }
        case "scalar":
          return PrismaWeaver.getGraphQLTypeByField(
            field.type,
            typeGetter,
            field
          )
      }
    })()
    if (!unwrappedType) return
    return {
      type: applyModelNullability(unwrappedType),
      description,
      ...options,
    }
  }

  public static config(config: PrismaWeaverConfigOptions): PrismaWeaverConfig {
    return {
      ...config,
      [SYMBOLS.WEAVER_CONFIG]: "gqloom.prisma",
    }
  }

  public static getFieldConfigOptions(
    fieldConfig: PrismaModelConfigOptionsField
  ): [
    typeGetter:
      | Getter<
          GraphQLOutputType | GraphQLSilk | typeof SYMBOLS.FIELD_HIDDEN | null
        >
      | undefined,
    options: Omit<GraphQLFieldConfig<any, any>, "type">,
    source: "silk" | "gqlType" | null,
  ] {
    if (fieldConfig === SYMBOLS.FIELD_HIDDEN) return [undefined, {}, null]

    if (isSilk(fieldConfig)) {
      return [silk.getType(fieldConfig), {}, "silk"]
    }
    if (isOutputType(fieldConfig)) {
      return [fieldConfig, {}, "gqlType"]
    }

    const { type: typeGetter, ...options } = fieldConfig ?? {}
    const fieldTypeFromConfig =
      typeof typeGetter === "function" ? typeGetter() : typeGetter
    if (
      fieldTypeFromConfig === SYMBOLS.FIELD_HIDDEN ||
      fieldTypeFromConfig === null
    ) {
      return [SYMBOLS.FIELD_HIDDEN, {}, null]
    }

    if (isSilk(fieldTypeFromConfig)) {
      return [silk.getType(fieldTypeFromConfig), options, "silk"]
    }
    return [
      fieldTypeFromConfig,
      options,
      fieldTypeFromConfig == null ? null : "gqlType",
    ]
  }

  public static getGraphQLTypeByField(
    type: string,
    typeGetter:
      | Getter<
          GraphQLOutputType | GraphQLSilk | typeof SYMBOLS.FIELD_HIDDEN | null
        >
      | undefined,
    field: DMMF.Field | null
  ): GraphQLOutputType | typeof SYMBOLS.FIELD_HIDDEN {
    const config = weaverContext.getConfig<PrismaWeaverConfig>("gqloom.prisma")

    const fieldTypeFromConfig =
      typeof typeGetter === "function" ? typeGetter() : typeGetter
    if (fieldTypeFromConfig === SYMBOLS.FIELD_HIDDEN)
      return SYMBOLS.FIELD_HIDDEN

    if (isSilk(fieldTypeFromConfig)) {
      return silk.getType(fieldTypeFromConfig)
    }
    if (fieldTypeFromConfig != null) {
      return fieldTypeFromConfig
    }

    const presetType = config?.presetGraphQLType?.(type, field ?? undefined)
    if (presetType) return presetType

    const isId = field?.isId ?? false
    if (isId && config?.emitIdAsIDType !== false) return GraphQLID
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
