import {
  type GraphQLSilk,
  SYMBOLS,
  type StandardSchemaV1,
  initWeaverContext,
  mapValue,
  provideWeaverContext,
  silk,
  weaverContext,
} from "@gqloom/core"
import {
  type EntityMetadata,
  type EntityProperty,
  type EntitySchema,
  type PropertyOptions,
  ReferenceKind,
  type RequiredEntityData,
  Type,
  types,
} from "@mikro-orm/core"
import {
  GraphQLBoolean,
  type GraphQLField,
  type GraphQLFieldConfig,
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  type GraphQLOutputType,
  GraphQLString,
} from "graphql"
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
  public static unravel<TSchema extends EntitySchema>(
    schema: TSchema
  ): EntitySchemaSilk<TSchema> {
    return Object.assign(schema, {
      "~standard": {
        version: 1,
        vendor: MikroWeaver.vendor,
        validate: (value: unknown) => ({
          value: value as InferEntity<TSchema>,
        }),
      } satisfies StandardSchemaV1.Props<InferEntity<TSchema>, unknown>,
      [SYMBOLS.GET_GRAPHQL_TYPE]: MikroWeaver.getGraphQLTypeBySelf,
      nullable() {
        return silk.nullable(this as unknown as GraphQLSilk)
      },
      list() {
        return silk.list(this) as GraphQLSilk<InferEntity<TSchema>[]>
      },
    })
  }

  public static ObjectConfigMap = new WeakMap<
    EntityMetadata,
    MikroSilkConfig<EntitySchema>
  >()

  public static asObjectType(
    schema: EntityMetadata,
    config: MikroSilkConfig<EntitySchema>
  ) {
    MikroWeaver.ObjectConfigMap.set(schema, config)
    return schema
  }

  public static getGraphQLTypeBySelf(this: EntitySchema) {
    return MikroWeaver.getGraphQLType(this.init().meta)
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

    const existing = weaverContext.getNamedType(name)
    if (existing != null) return new GraphQLNonNull(existing)

    const properties = meta.properties

    const originType = EntityGraphQLTypes.get(meta)
    const originFields = originType?.getFields()

    return new GraphQLNonNull(
      weaverContext.memoNamedType(
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

    return { type: gqlType, description: property.comment }

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

    function nonNull(gqlType: GraphQLOutputType) {
      if (nullable != null) {
        return nullable ? gqlType : new GraphQLNonNull(gqlType)
      }
      if (!property.nullable) {
        if (gqlType instanceof GraphQLNonNull) return gqlType
        return new GraphQLNonNull(gqlType)
      }
      return gqlType
    }
  }

  public static getFieldType(
    property: EntityProperty,
    entity: EntityMetadata
  ): GraphQLOutputType | undefined {
    const entityConfig = MikroWeaver.ObjectConfigMap.get(entity)
    const fieldsConfig =
      typeof entityConfig?.fields === "function"
        ? entityConfig.fields()
        : entityConfig?.fields
    const fieldConfig = fieldsConfig?.[property.name]
    if (fieldConfig !== undefined) {
      if (fieldConfig === SYMBOLS.FIELD_HIDDEN) return
      let type: GraphQLOutputType | undefined | null | false
      if (typeof fieldConfig.type === "function") {
        type = fieldConfig.type()
      } else {
        type = fieldConfig.type
      }
      if (type !== undefined) {
        return type ? type : undefined
      }
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
export function mikroSilk<TSchema extends EntitySchema>(
  schema: TSchema,
  config?: MikroSilkConfig<TSchema>
): EntitySchemaSilk<TSchema> {
  if (config) MikroWeaver.asObjectType(schema.init().meta, config)
  return MikroWeaver.unravel(schema)
}

export type EntitySchemaSilk<TSchema extends EntitySchema> = TSchema &
  GraphQLSilk<
    InferEntity<TSchema>,
    RequiredEntityData<InferEntity<TSchema>>
  > & {
    nullable: () => GraphQLSilk<
      InferEntity<TSchema> | null | undefined,
      InferEntity<TSchema> | null | undefined
    >
    list: () => GraphQLSilk<InferEntity<TSchema>[], InferEntity<TSchema>[]>
  }

export type EntitySilk<TEntity> = EntitySchemaSilk<EntitySchema<TEntity>>

export * from "./entity-schema"
export * from "./factory/resolver"
export * from "./types"
