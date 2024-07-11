import {
  type GraphQLSilk,
  SYMBOLS,
  initWeaverContext,
  mapValue,
  provideWeaverContext,
  weaverContext,
  silk,
} from "@gqloom/core"
import {
  ReferenceKind,
  type RequiredEntityData,
  type EntityProperty,
  type EntitySchema,
} from "@mikro-orm/core"
import {
  type GraphQLFieldConfig,
  GraphQLObjectType,
  type GraphQLOutputType,
  GraphQLString,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLList,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLID,
  type GraphQLField,
} from "graphql"
import {
  type MikroWeaverConfig,
  type MikroWeaverConfigOptions,
  type InferEntity,
} from "./types"
import { EntityGraphQLTypes } from "./utils"

export class MikroWeaver {
  /**
   * get GraphQL Silk from Mikro Entity Schema
   * @param schema Mikro Entity Schema
   * @returns GraphQL Silk Like Mikro Entity Schema
   */
  static unravel<TSchema extends EntitySchema>(
    schema: TSchema
  ): EntitySchemaSilk<TSchema> {
    return Object.assign(schema, {
      [SYMBOLS.GET_GRAPHQL_TYPE]: MikroWeaver.getGraphQLTypeBySelf,
      nullable() {
        return silk.nullable(this as unknown as GraphQLSilk)
      },
    })
  }

  static getGraphQLTypeBySelf(this: EntitySchema) {
    return MikroWeaver.getGraphQLType(this)
  }

  static getGraphQLType<TSchema extends EntitySchema>(
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
    const name = entityName ?? entity.meta.className

    const existing = weaverContext.objectMap?.get(name)
    if (existing != null) return new GraphQLNonNull(existing)

    const properties = entity.init().meta.properties

    const originType = EntityGraphQLTypes.get(entity)
    const originFields = originType?.getFields()

    return new GraphQLNonNull(
      weaverContext.memo(
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
        })
      )
    )
  }

  static getFieldConfig(
    property: EntityProperty,
    {
      nullable,
      originField,
    }: {
      nullable?: boolean
      originField?: GraphQLField<any, any, any>
    } = {}
  ): GraphQLFieldConfig<any, any> | undefined {
    if (property.hidden) return
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

  static getFieldType(property: EntityProperty): GraphQLOutputType | undefined {
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
  static extractSimpleType(type: string): EntityProperty["type"] {
    return type.toLowerCase().match(/[^(), ]+/)![0]
  }

  /**
   * Create a Valibot weaver config object
   * @param config Valibot weaver config options
   * @returns a Valibot weaver config object
   */
  static config = function (
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
  static useConfig = function (
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
 * @returns GraphQL Silk Like Mikro Entity Schema
 */
export const mikroSilk = MikroWeaver.unravel

export type EntitySchemaSilk<TSchema extends EntitySchema> = TSchema &
  GraphQLSilk<
    InferEntity<TSchema>,
    RequiredEntityData<InferEntity<TSchema>>
  > & {
    nullable: () => GraphQLSilk<InferEntity<TSchema> | null>
  }

export * from "./entity-schema"
export * from "./operations"
export * from "./types"
