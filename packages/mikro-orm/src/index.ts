import {
  type GraphQLSilk,
  initWeaverContext,
  isSilk,
  mapValue,
  provideWeaverContext,
  type StandardSchemaV1,
  SYMBOLS,
  silk,
  weaverContext,
} from "@gqloom/core"
import {
  type EntityMetadata,
  type EntityName,
  type EntityProperty,
  type EntitySchema,
  type PropertyOptions,
  Reference,
  ReferenceKind,
  ScalarReference,
  Type,
  types,
} from "@mikro-orm/core"
import {
  GraphQLBoolean,
  type GraphQLField,
  type GraphQLFieldConfig,
  GraphQLFloat,
  GraphQLID,
  type GraphQLInputType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  type GraphQLOutputType,
  GraphQLString,
  isInputType,
  isNonNullType,
  isOutputType,
} from "graphql"
import { getMetadata, getWeaverConfigMetadata } from "./helper"
import type {
  InferEntity,
  MikroSilkConfig,
  MikroWeaverConfig,
  MikroWeaverConfigOptions,
} from "./types"
import { EntityGraphQLTypes, isSubclass } from "./utils"

export class MikroWeaver {
  public static vendor = "gqloom.mikro-orm"

  /**
   * get GraphQL Silk from Mikro Entity Schema
   * @param schema Mikro Entity Schema
   * @returns GraphQL Silk Like Mikro Entity Schema
   */
  public static unravel<TEntityName extends EntityName<any> & object>(
    schema: TEntityName,
    config?: MikroSilkConfig<InferEntity<TEntityName>>
  ): EntitySchemaSilk<TEntityName> {
    return Object.assign(schema, {
      "~standard": {
        version: 1,
        vendor: MikroWeaver.vendor,
        validate: MikroWeaver.compileValidator(
          config
        ) as StandardSchemaV1.Props<
          InferEntity<TEntityName>,
          unknown
        >["validate"],
      } satisfies StandardSchemaV1.Props<InferEntity<TEntityName>, unknown>,
      [SYMBOLS.GET_GRAPHQL_TYPE]: MikroWeaver.getGraphQLTypeBySelf,
      nullable() {
        return silk.nullable(this as unknown as GraphQLSilk)
      },
      list() {
        return silk.list(this) as GraphQLSilk<InferEntity<TEntityName>[]>
      },
      "~silkConfig": config,
    }) as EntitySchemaSilk<TEntityName>
  }

  /**
   * Compile a validate function from config.fields: each field with a Silk
   * (~standard.validate) is validated; issues get path prefixed with the field key.
   */
  public static compileValidator<TEntity extends object>(
    config: MikroSilkConfig<TEntity> | undefined
  ): StandardSchemaV1.Props<TEntity, unknown>["validate"] {
    const rawFields =
      config == null
        ? undefined
        : typeof config.fields === "function"
          ? config.fields()
          : config.fields

    if (rawFields == null || typeof rawFields !== "object") {
      return (value: unknown) => ({ value: value as TEntity })
    }

    const validators = new Map<
      string,
      StandardSchemaV1.Props<unknown, unknown>["validate"]
    >()
    for (const key of Object.keys(rawFields)) {
      const fn = MikroWeaver.getFieldValidateFn(
        (rawFields as Record<string, unknown>)[key]
      )
      if (fn) validators.set(key, fn)
    }

    if (validators.size === 0) {
      return (value: unknown) => ({ value: value as TEntity })
    }

    return async (value: unknown) => {
      if (value == null || typeof value !== "object") {
        return { value: value as TEntity }
      }
      const valueObj = value as Record<string, unknown>
      const result: Record<string, unknown> = { ...valueObj }
      const issues: StandardSchemaV1.Issue[] = []

      for (const [key, validateFn] of validators) {
        if (!(key in valueObj)) continue
        const fieldResult = await validateFn(valueObj[key])
        if (fieldResult.issues) {
          for (const issue of fieldResult.issues) {
            issues.push({
              ...issue,
              path: [key, ...(issue.path ?? [])],
            })
          }
        } else if ("value" in fieldResult) {
          result[key] = fieldResult.value
        }
      }

      if (issues.length > 0) return { issues }
      return { value: result as TEntity }
    }
  }

  /**
   * Extract the validate function from a field schema (Silk) if it has ~standard.validate.
   */
  protected static getFieldValidateFn(
    fieldSchema: unknown
  ): StandardSchemaV1.Props<unknown, unknown>["validate"] | null {
    if (
      fieldSchema == null ||
      typeof fieldSchema !== "object" ||
      !("~standard" in fieldSchema)
    ) {
      return null
    }
    const validate = (fieldSchema as StandardSchemaV1)["~standard"]?.validate
    return typeof validate === "function" ? validate : null
  }

  public static ObjectConfigMap = new WeakMap<
    EntityMetadata,
    MikroSilkConfig<EntitySchema>
  >()

  private static fieldConfigsCache = new WeakMap<
    EntityMetadata,
    Partial<
      Record<
        string,
        | GraphQLSilk<any, any>
        | GraphQLOutputType
        | GraphQLInputType
        | typeof SYMBOLS.FIELD_HIDDEN
      >
    >
  >()

  public static getGraphQLTypeBySelf(
    this: EntityName<unknown> & object
  ): ReturnType<typeof MikroWeaver.getGraphQLType> {
    const pendingConfig = (
      this as EntitySchemaSilk<EntityName<unknown> & object>
    )["~silkConfig"]
    const meta = getMetadata(
      this,
      getWeaverConfigMetadata() ?? pendingConfig?.metadata
    )
    if (pendingConfig) {
      MikroWeaver.ObjectConfigMap.set(meta, pendingConfig)
    }
    return MikroWeaver.getGraphQLType(meta)
  }

  public static getGraphQLType(
    meta: EntityMetadata,
    {
      required,
      partial,
      pick,
      name: entityName,
    }: {
      required?: string[] | boolean
      partial?: string[] | boolean
      pick?: string[]
      name?: string
    } = {}
  ) {
    const config = MikroWeaver.ObjectConfigMap.get(meta)
    const name = entityName ?? meta.className ?? config?.name

    const existing = weaverContext.getGraphQLType(meta)
    if (existing != null) return new GraphQLNonNull(existing)

    const properties = meta.properties
    const originType = EntityGraphQLTypes.get(meta)
    const originFields = originType?.getFields()

    return new GraphQLNonNull(
      weaverContext.memoGraphQLType(
        meta,
        new GraphQLObjectType({
          name: name ?? meta.className,
          ...config,
          fields: mapValue(properties, (value, key) => {
            if (pick != null && !pick.includes(key)) return mapValue.SKIP
            const originField = originFields?.[key]
            const nullable: boolean | undefined = (() => {
              if (Array.isArray(required))
                return !required.includes(key) || undefined
              if (Array.isArray(partial))
                return partial.includes(key) || undefined
              if (typeof required === "boolean") return !required
              if (typeof partial === "boolean") return partial
            })()

            const field = MikroWeaver.getFieldConfig(value, meta, {
              nullable,
              originField,
            })
            if (field == null) return mapValue.SKIP
            return field
          }),
        })
      )
    )
  }

  public static getFieldConfig(
    property: EntityProperty,
    entity: EntityMetadata,
    {
      nullable,
      originField,
    }: {
      nullable?: boolean
      originField?: GraphQLField<any, any, any>
    } = {}
  ): GraphQLFieldConfig<any, any> | undefined {
    if (property.hidden != null) return
    let gqlType = originField?.type ?? getGraphQLTypeByProperty()
    if (gqlType == null) return
    gqlType = nonNull(gqlType)

    const resolveReference = (parent: any) => {
      const prop = (parent as any)[property.name]
      if (prop instanceof Reference) {
        return prop.load({ dataloader: true })
      }
      if (prop instanceof ScalarReference) {
        return prop.load({ dataloader: true })
      }
      return prop
    }

    return {
      type: gqlType,
      description: property.comment,
      resolve:
        property.ref || property.kind !== ReferenceKind.SCALAR
          ? resolveReference
          : undefined,
    }

    function getGraphQLTypeByProperty() {
      let gqlType = MikroWeaver.getFieldType(property, entity)
      if (gqlType == null) return

      gqlType = list(gqlType)
      return gqlType
    }
    function list(gqlType: GraphQLOutputType) {
      const nType = MikroWeaver.normalizeType(property)
      if (nType.endsWith("[]") || nType === "array") {
        return new GraphQLList(new GraphQLNonNull(gqlType))
      }
      return gqlType
    }

    // Optionality follows entity definition only; strip or add top-level NonNull to match.
    function nonNull(gqlType: GraphQLOutputType) {
      const baseType = isNonNullType(gqlType) ? gqlType.ofType : gqlType
      const shouldBeNonNull =
        nullable != null ? !nullable : property.nullable !== true
      return shouldBeNonNull ? new GraphQLNonNull(baseType) : baseType
    }
  }

  /**
   * Get raw field config map from entity's mikroSilk config (config.fields).
   * Each value is Silk, GraphQL type, or FIELD_HIDDEN. Cached per entity.
   */
  public static getFieldConfigs(
    entity: EntityMetadata
  ): Partial<
    Record<
      string,
      | GraphQLSilk<any, any>
      | GraphQLOutputType
      | GraphQLInputType
      | typeof SYMBOLS.FIELD_HIDDEN
    >
  > {
    const cached = MikroWeaver.fieldConfigsCache.get(entity)
    if (cached !== undefined) return cached

    const entityConfig = MikroWeaver.ObjectConfigMap.get(entity)
    const fieldsConfig =
      typeof entityConfig?.fields === "function"
        ? entityConfig.fields()
        : entityConfig?.fields
    const raw = (fieldsConfig as Record<string, unknown>) ?? {}
    const result: Partial<
      Record<
        string,
        | GraphQLSilk<any, any>
        | GraphQLOutputType
        | GraphQLInputType
        | typeof SYMBOLS.FIELD_HIDDEN
      >
    > = {}
    for (const key of Object.keys(raw)) {
      const fieldConfig = raw[key]
      if (fieldConfig === undefined) continue
      if (fieldConfig === SYMBOLS.FIELD_HIDDEN) {
        result[key] = SYMBOLS.FIELD_HIDDEN
        continue
      }
      if (isSilk(fieldConfig)) {
        result[key] = fieldConfig as GraphQLSilk<any, any>
        continue
      }
      if (isInputType(fieldConfig) || isOutputType(fieldConfig)) {
        result[key] = fieldConfig
        continue
      }
      const rawType =
        typeof (fieldConfig as { type?: unknown }).type === "function"
          ? ((fieldConfig as { type: () => unknown }).type as () => unknown)()
          : (fieldConfig as { type?: unknown }).type
      if (rawType === undefined) continue
      if (rawType === null || rawType === SYMBOLS.FIELD_HIDDEN) {
        result[key] = SYMBOLS.FIELD_HIDDEN
        continue
      }
      if (isSilk(rawType)) {
        result[key] = rawType as GraphQLSilk<any, any>
        continue
      }
      if (isInputType(rawType) || isOutputType(rawType)) {
        result[key] = rawType
      }
    }
    MikroWeaver.fieldConfigsCache.set(entity, result)
    return result
  }

  public static getFieldType(
    property: EntityProperty,
    entity: EntityMetadata
  ): GraphQLOutputType | undefined {
    const raw = MikroWeaver.getFieldConfigs(entity)[property.name]
    if (raw === SYMBOLS.FIELD_HIDDEN) return undefined
    if (raw !== undefined) {
      if (isSilk(raw)) return silk.getType(raw)
      if (isOutputType(raw)) return raw
    }

    const config =
      weaverContext.getConfig<MikroWeaverConfig>("gqloom.mikro-orm")
    const presetType = config?.presetGraphQLType?.(property)

    if (presetType) return presetType
    if (property.kind !== ReferenceKind.SCALAR) return
    if (property.primary === true) return GraphQLID

    const simpleType = MikroWeaver.extractSimpleType(
      MikroWeaver.normalizeType(property)
    )

    switch (simpleType) {
      case "string":
        return GraphQLString
      case "double":
      case "number":
      case "decimal":
      case "float":
        return GraphQLFloat
      case "smallint":
      case "tinyint":
      case "bigint":
      case "mediumint":
      case "integer":
        return GraphQLInt
      case "boolean":
        return GraphQLBoolean
      default:
        return GraphQLString
    }
  }

  protected static typeNames: Map<any, string> = new Map(
    Object.entries(types).map(([key, value]) => [value, key])
  )

  protected static normalizeType(
    prop: Pick<PropertyOptions<any>, "type" | "runtimeType">
  ): string {
    if (prop.runtimeType) return prop.runtimeType
    if (typeof prop.type === "string") return prop.type
    if (prop.type instanceof Type) {
      return MikroWeaver.typeNames.get(prop.type) ?? prop.type.runtimeType
    }
    if (isSubclass(prop.type, Type)) {
      return (
        MikroWeaver.typeNames.get(prop.type) ?? prop.type.prototype.runtimeType
      )
    }
    return "string"
  }

  // mikro-orm Platform.extractSimpleType
  protected static extractSimpleType(type: string): EntityProperty["type"] {
    let simpleType = type.toLowerCase().match(/[^(), ]+/)![0]
    if (simpleType.endsWith("[]")) simpleType = simpleType.slice(0, -2)
    return simpleType
  }

  /**
   * Create a Mikro-ORM weaver config object
   * @param config Mikro-ORM weaver config options
   * @returns a Mikro-ORM weaver config object
   */
  public static config = function (
    config: MikroWeaverConfigOptions
  ): MikroWeaverConfig {
    return {
      ...config,
      [SYMBOLS.WEAVER_CONFIG]: "gqloom.mikro-orm",
    }
  }

  /**
   * Use a Mikro-ORM weaver config
   * @param config Mikro-ORM weaver config options
   * @returns a new Mikro-ORM Schema to silk function
   */
  public static useConfig = function (
    config: MikroWeaverConfigOptions
  ): typeof MikroWeaver.unravel {
    return (schema) => {
      const context = weaverContext.value ?? initWeaverContext()
      context.setConfig<MikroWeaverConfig>({
        ...config,
        [SYMBOLS.WEAVER_CONFIG]: "gqloom.mikro-orm",
      })
      return provideWeaverContext(() => MikroWeaver.unravel(schema), context)
    }
  }
}

/**
 * get GraphQL Silk from Mikro Entity Schema
 * @param schema Mikro Entity Schema
 * @param config GraphQL Object Type Config
 * @returns GraphQL Silk Like Mikro Entity Schema
 */
export function mikroSilk<TEntityName extends EntityName<any> & object>(
  entityName: TEntityName,
  config?: MikroSilkConfig<InferEntity<TEntityName>>
): EntitySchemaSilk<TEntityName> {
  return MikroWeaver.unravel(entityName, config)
}

export type EntitySchemaSilk<TEntityName extends EntityName<any>> =
  TEntityName &
    GraphQLSilk<
      Partial<InferEntity<TEntityName>>,
      Partial<InferEntity<TEntityName>>
    > & {
      nullable: () => GraphQLSilk<
        Partial<InferEntity<TEntityName>> | null | undefined,
        Partial<InferEntity<TEntityName>> | null | undefined
      >
      list: () => GraphQLSilk<
        Partial<InferEntity<TEntityName>>[],
        Partial<InferEntity<TEntityName>>[]
      >
      "~silkConfig": MikroSilkConfig<EntitySchema> | undefined
    }

export * from "./entity-schema"
export * from "./factory"
export * from "./types"
