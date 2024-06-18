import { type GraphQLSilk } from "@gqloom/core"
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

export class MikroSilk<TEntity>
  implements GraphQLSilk<TEntity, RequiredEntityData<TEntity>>
{
  "~types"?: { output: TEntity; input: RequiredEntityData<TEntity> }

  getGraphQLType() {
    const fields: Record<string, GraphQLFieldConfig<any, any>> = {}
    const properties = this.schema.init().meta.properties

    for (const [key, value] of Object.entries(properties) as [
      string,
      EntityProperty,
    ][]) {
      const field = MikroSilk.propertyToField(value)
      if (field == null) continue
      fields[key] = field
    }

    return new GraphQLObjectType({
      name: this.schema.meta.className,
      fields,
    })
  }

  constructor(public readonly schema: EntitySchema<TEntity, any>) {}

  static propertyToField(
    property: EntityProperty
  ): GraphQLFieldConfig<any, any> | undefined {
    const type = MikroSilk.propertyGraphQLType(property)
    if (type == null) return undefined
    return { type }
  }

  static propertyGraphQLType(
    property: EntityProperty
  ): GraphQLOutputType | undefined {
    let gqlType = MikroSilk.propertyGraphQLTypeInner(property)
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

    switch (MikroSilk.extractSimpleType(property.type)) {
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

export function mikroSilk<TEntity>(
  schema: EntitySchema<TEntity, any>
): MikroSilk<TEntity> {
  return new MikroSilk(schema)
}

export * from "./entity-schema"
