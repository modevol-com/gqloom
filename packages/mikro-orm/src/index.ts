import { mapValue, type GraphQLSilk } from "@gqloom/core"
import {
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
} from "graphql"

export class MikroSilk<TEntity>
  implements GraphQLSilk<TEntity, RequiredEntityData<TEntity>>
{
  _types?: { output: TEntity; input: RequiredEntityData<TEntity> }

  getGraphQLType() {
    return new GraphQLObjectType({
      name: this.schema.meta.className,
      fields: mapValue(this.schema.meta.properties, MikroSilk.propertyToField),
    })
  }

  constructor(public readonly schema: EntitySchema<TEntity, any>) {}

  static propertyToField(
    property: EntityProperty
  ): GraphQLFieldConfig<any, any> {
    const type = MikroSilk.propertyGraphQLType(property)
    return { type }
  }

  static propertyGraphQLType(property: EntityProperty): GraphQLOutputType {
    let gqlType = MikroSilk.propertyGraphQLTypeInner(property)
    gqlType = list(gqlType)
    gqlType = nonNull(gqlType)
    return gqlType

    function list(gqlType: GraphQLOutputType) {
      if (property.array) return new GraphQLList(new GraphQLNonNull(gqlType))
      return gqlType
    }

    function nonNull(gqlType: GraphQLOutputType) {
      if (!property.nullable) return new GraphQLNonNull(gqlType)
      return gqlType
    }
  }

  static propertyGraphQLTypeInner(property: EntityProperty): GraphQLOutputType {
    switch (property.type) {
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
}

export function mikroSilk<TEntity>(
  schema: EntitySchema<TEntity, any>
): MikroSilk<TEntity> {
  return new MikroSilk(schema)
}
