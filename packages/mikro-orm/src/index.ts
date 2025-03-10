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
  type EntityProperty,
  type EntitySchema,
  ReferenceKind,
  type RequiredEntityData,
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
  type GraphQLObjectTypeConfig,
  type GraphQLOutputType,
  GraphQLString,
} from "graphql"
import type {
  InferEntity,
  MikroWeaverConfig,
  MikroWeaverConfigOptions,
} from "./types"
import { EntityGraphQLTypes } from "./utils"

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
    EntitySchema,
    Partial<GraphQLObjectTypeConfig<any, any>>
  >()

  public static asObjectType(
    schema: EntitySchema,
    config: Partial<GraphQLObjectTypeConfig<any, any>>
  ) {
    MikroWeaver.ObjectConfigMap.set(schema, config)
    return schema
  }

  public static getGraphQLTypeBySelf(this: EntitySchema) {
    return MikroWeaver.getGraphQLType(this)
  }

  public static getGraphQLType<TSchema extends EntitySchema>(
    entity: TSchema,
    {
      required,
      partial,
      pick,
      name: entityName,
    }: {
      required?: (keyof InferEntity<TSchema>)[] | boolean
      partial?: (keyof InferEntity<TSchema>)[] | boolean
      pick?: (keyof InferEntity<TSchema>)[]
      name?: string
    } = {}
  ) {
    const config = MikroWeaver.ObjectConfigMap.get(entity)
    const name = entityName ?? entity.meta.className ?? config?.name

    const existing = weaverContext.getNamedType(name)
    if (existing != null) return new GraphQLNonNull(existing)

    const properties = entity.init().meta.properties

    const originType = EntityGraphQLTypes.get(entity)
    const originFields = originType?.getFields()

    return new GraphQLNonNull(
      weaverContext.memoNamedType(
        new GraphQLObjectType({
          name: name ?? entity.meta.className,
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

            const field = MikroWeaver.getFieldConfig(value, {
              nullable,
              originField,
            })
            if (field == null) return mapValue.SKIP
            return field
          }),
          ...config,
        })
      )
    )
  }

  public static getFieldConfig(
    property: EntityProperty,
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
      let gqlType = MikroWeaver.getFieldType(property)
      if (gqlType == null) return

      gqlType = list(gqlType)
      return gqlType
    }
    function list(gqlType: GraphQLOutputType) {
      if (property.type.endsWith("[]"))
        return new GraphQLList(new GraphQLNonNull(gqlType))
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
    property: EntityProperty
  ): GraphQLOutputType | undefined {
    const config =
      weaverContext.getConfig<MikroWeaverConfig>("gqloom.mikro-orm")
    const presetType = config?.presetGraphQLType?.(property)

    if (presetType) return presetType
    if (property.kind !== ReferenceKind.SCALAR) return
    if (property.primary === true) return GraphQLID

    switch (MikroWeaver.extractSimpleType(property.type)) {
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

  // mikro-orm Platform.extractSimpleType
  protected static extractSimpleType(type: string): EntityProperty["type"] {
    return type.toLowerCase().match(/[^(), ]+/)![0]
  }

  /**
   * Create a Valibot weaver config object
   * @param config Valibot weaver config options
   * @returns a Valibot weaver config object
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
   * Use a Valibot weaver config
   * @param config Valibot weaver config options
   * @returns a new Valibot to silk function
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
  config?: Partial<GraphQLObjectTypeConfig<any, any>>
): EntitySchemaSilk<TSchema> {
  if (config) MikroWeaver.asObjectType(schema, config)
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
export * from "./resolver-factory"
export * from "./types"
