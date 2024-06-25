import { SYMBOLS, type GraphQLSilk } from "@gqloom/core"
import {
  ReferenceKind,
  type EntityProperty,
  type EntitySchema,
  type RequiredEntityData,
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
} from "graphql"
import { type InferEntity } from "./types"

export class MikroWeaver {
  /**
   * get GraphQL Silk from Mikro Entity Schema
   * @param schema Mikro Entity Schema
   * @returns GraphQL Silk Like Mikro Entity Schema
   */
  static unravel<TSchema extends EntitySchema, TEntity = InferEntity<TSchema>>(
    schema: TSchema
  ): TSchema & GraphQLSilk<TEntity, RequiredEntityData<TEntity>> {
    return Object.assign(schema, {
      [SYMBOLS.GET_GRAPHQL_TYPE]: getGraphQLType,
    })
  }

  static propertyToField(
    property: EntityProperty
  ): GraphQLFieldConfig<any, any> | undefined {
    const type = MikroWeaver.propertyGraphQLType(property)
    if (type == null) return undefined
    return { type }
  }

  static propertyGraphQLType(
    property: EntityProperty
  ): GraphQLOutputType | undefined {
    let gqlType = MikroWeaver.propertyGraphQLTypeInner(property)
    if (gqlType == null) return
    gqlType = list(gqlType)
    gqlType = nonNull(gqlType)
    return gqlType

    function list(gqlType: GraphQLOutputType) {
      if (property.type.endsWith("[]"))
        return new GraphQLList(new GraphQLNonNull(gqlType))
      return gqlType
    }

    function nonNull(gqlType: GraphQLOutputType) {
      if (!property.nullable) return new GraphQLNonNull(gqlType)
      return gqlType
    }
  }

  static propertyGraphQLTypeInner(
    property: EntityProperty
  ): GraphQLOutputType | undefined {
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
}

function getGraphQLType(this: EntitySchema) {
  const fields: Record<string, GraphQLFieldConfig<any, any>> = {}
  const properties = this.init().meta.properties

  for (const [key, value] of Object.entries(properties) as [
    string,
    EntityProperty,
  ][]) {
    const field = MikroWeaver.propertyToField(value)
    if (field == null) continue
    fields[key] = field
  }

  return new GraphQLObjectType({
    name: this.meta.className,
    fields,
  })
}

/**
 * get GraphQL Silk from Mikro Entity Schema
 * @param schema Mikro Entity Schema
 * @returns GraphQL Silk Like Mikro Entity Schema
 */
export const mikroSilk = MikroWeaver.unravel

export * from "./entity-schema"
export * from "./types"
