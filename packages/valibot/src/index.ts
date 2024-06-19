import {
  type InferOutput,
  type InferInput,
  safeParseAsync,
  strictObjectAsync,
} from "valibot"
import {
  SYMBOLS,
  mapValue,
  weaverContext,
  type GraphQLSilk,
} from "@gqloom/core"
import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
  isNonNullType,
  type GraphQLOutputType,
} from "graphql"
import { ValibotMetadataCollector } from "./metadata"
import { nullishTypes } from "./utils"
import { type SupportedSchema, type BaseSchemaOrAsync } from "./types"

export class ValibotSilkBuilder {
  static toNullableGraphQLType(schema: BaseSchemaOrAsync): GraphQLOutputType {
    const gqlType = ValibotSilkBuilder.toGraphQLType(schema)

    weaverContext.memo(gqlType)
    return ValibotSilkBuilder.nullable(gqlType, schema)
  }

  static toGraphQLType(
    valibotSchema: BaseSchemaOrAsync,
    ...wrappers: BaseSchemaOrAsync[]
  ): GraphQLOutputType {
    const config = ValibotMetadataCollector.getFieldConfig(
      valibotSchema,
      ...wrappers
    )
    if (config?.type) return config.type

    const schema = valibotSchema as SupportedSchema
    switch (schema.type) {
      case "array": {
        const itemType = ValibotSilkBuilder.toGraphQLType(
          schema.item,
          schema,
          ...wrappers
        )
        return new GraphQLList(
          ValibotSilkBuilder.nullable(itemType, schema.item)
        )
      }
      case "bigint":
        return GraphQLInt
      case "boolean":
        return GraphQLBoolean
      case "date":
        return GraphQLString
      case "enum":
        throw new Error("todo") // TODO
      case "literal":
        switch (typeof schema.literal) {
          case "boolean":
            return GraphQLBoolean
          case "number":
          case "bigint":
            return GraphQLFloat
          default:
            return GraphQLString
        }
      case "loose_object":
      case "object":
      case "strict_object": {
        const { name, ...objectConfig } =
          ValibotMetadataCollector.getObjectConfig(schema, ...wrappers) ?? {}
        if (!name) throw new Error("Object must have a name")

        const existing = weaverContext.objectMap?.get(name)
        if (existing) return existing

        const strictSchema = strictObjectAsync(schema.entries)

        return new GraphQLObjectType({
          name,
          fields: mapValue(schema.entries, (field) => {
            const fieldConfig = ValibotMetadataCollector.getFieldConfig(field)
            return {
              type: ValibotSilkBuilder.toNullableGraphQLType(field),
              ...fieldConfig,
            }
          }),
          isTypeOf: (input) =>
            safeParseAsync(strictSchema, input).then((x) => x.success),
          ...objectConfig,
        })
      }
      case "non_nullable":
      case "non_nullish":
      case "non_optional":
        return new GraphQLNonNull(
          ValibotSilkBuilder.toGraphQLType(schema.wrapped, schema, ...wrappers)
        )
      case "nullable":
      case "nullish":
      case "optional":
        return ValibotSilkBuilder.toGraphQLType(
          schema.wrapped,
          schema,
          ...wrappers
        )
      case "number":
        if (ValibotMetadataCollector.isInteger(schema, ...wrappers))
          return GraphQLInt
        return GraphQLFloat
      case "string":
        if (ValibotMetadataCollector.isID(schema, ...wrappers)) return GraphQLID
        return GraphQLString
    }

    throw new Error(`Unsupported schema type ${schema.type}`)
  }

  static nullable(ofType: GraphQLOutputType, wrapper: BaseSchemaOrAsync) {
    const isNullish = nullishTypes.has(wrapper.type)
    if (isNullish) return ofType
    if (isNonNullType(ofType)) return ofType
    return new GraphQLNonNull(ofType)
  }
}

export function valibotSilk<TSchema extends BaseSchemaOrAsync>(
  schema: TSchema
): TSchema & GraphQLSilk<InferOutput<TSchema>, InferInput<TSchema>> {
  return Object.assign(schema, { [SYMBOLS.GET_GRAPHQL_TYPE]: getGraphQLType })
}

function getGraphQLType(this: BaseSchemaOrAsync): GraphQLOutputType {
  return ValibotSilkBuilder.toNullableGraphQLType(this)
}
