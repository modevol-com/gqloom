import {
  type BaseIssue,
  type BaseSchema,
  type InferOutput,
  type InferInput,
  type ArraySchema,
  type ArraySchemaAsync,
  type BigintSchema,
  type BooleanSchema,
  type DateSchema,
  type EnumSchema,
  type Enum,
  type LiteralSchema,
  type Literal,
  type LooseObjectSchema,
  type ObjectEntries,
  type ObjectEntriesAsync,
  type LooseObjectSchemaAsync,
  type NonNullableSchema,
  type NonNullableSchemaAsync,
  type NonNullishSchema,
  type NonNullishSchemaAsync,
  type NonOptionalSchemaAsync,
  type NonOptionalSchema,
  type NullableSchema,
  type NullableSchemaAsync,
  type NullishSchema,
  type NullishSchemaAsync,
  type NumberSchema,
  type ObjectSchema,
  type ObjectSchemaAsync,
  type OptionalSchema,
  type OptionalSchemaAsync,
  type PicklistSchema,
  type PicklistOptions,
  type StrictObjectSchema,
  type StrictObjectSchemaAsync,
  type StringSchema,
  type UnionOptions,
  type UnionSchema,
  type UnionSchemaAsync,
  type UnionOptionsAsync,
  type VariantSchema,
  type VariantOptions,
  type VariantOptionsAsync,
  type VariantSchemaAsync,
} from "valibot"
import { SYMBOLS, weaverContext, type GraphQLSilk } from "@gqloom/core"
import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLString,
  isNonNullType,
  type GraphQLOutputType,
} from "graphql"
import { ValibotMetadataCollector } from "./metadata"

type SupportedSchema =
  | ArraySchema<BaseSchema<unknown, unknown, BaseIssue<unknown>>, any>
  | ArraySchemaAsync<BaseSchema<unknown, unknown, BaseIssue<unknown>>, any>
  | BigintSchema<any>
  | BooleanSchema<any>
  | DateSchema<any>
  | EnumSchema<Enum, any>
  | LiteralSchema<Literal, any>
  | LooseObjectSchema<ObjectEntries, any>
  | LooseObjectSchemaAsync<ObjectEntriesAsync, any>
  | NonNullableSchema<BaseSchema<unknown, unknown, BaseIssue<unknown>>, any>
  | NonNullableSchemaAsync<
      BaseSchema<unknown, unknown, BaseIssue<unknown>>,
      any
    >
  | NonNullishSchema<BaseSchema<unknown, unknown, BaseIssue<unknown>>, any>
  | NonNullishSchemaAsync<BaseSchema<unknown, unknown, BaseIssue<unknown>>, any>
  | NonOptionalSchema<BaseSchema<unknown, unknown, BaseIssue<unknown>>, any>
  | NonOptionalSchemaAsync<
      BaseSchema<unknown, unknown, BaseIssue<unknown>>,
      any
    >
  | NullableSchema<BaseSchema<unknown, unknown, BaseIssue<unknown>>, any>
  | NullableSchemaAsync<BaseSchema<unknown, unknown, BaseIssue<unknown>>, any>
  | NullishSchema<BaseSchema<unknown, unknown, BaseIssue<unknown>>, any>
  | NullishSchemaAsync<BaseSchema<unknown, unknown, BaseIssue<unknown>>, any>
  | NumberSchema<any>
  | ObjectSchema<ObjectEntries, any>
  | ObjectSchemaAsync<ObjectEntriesAsync, any>
  | OptionalSchema<BaseSchema<unknown, unknown, BaseIssue<unknown>>, any>
  | OptionalSchemaAsync<BaseSchema<unknown, unknown, BaseIssue<unknown>>, any>
  | PicklistSchema<PicklistOptions, any>
  | StrictObjectSchema<ObjectEntries, any>
  | StrictObjectSchemaAsync<ObjectEntriesAsync, any>
  | StringSchema<any>
  | UnionSchema<UnionOptions, any>
  | UnionSchemaAsync<UnionOptionsAsync, any>
  | VariantSchema<string, VariantOptions<string>, any>
  | VariantSchemaAsync<string, VariantOptionsAsync<string>, any>
export class ValibotSilkBuilder {
  static toNullableGraphQLType(
    schema: BaseSchema<unknown, unknown, BaseIssue<unknown>>
  ): GraphQLOutputType {
    const nullable = (ofType: GraphQLOutputType) => {
      const isNullish = ValibotSilkBuilder.nullishTypes.has(schema.type)
      if (isNullish) return ofType
      if (isNonNullType(ofType)) return ofType
      return new GraphQLNonNull(ofType)
    }

    const gqlType = ValibotSilkBuilder.toGraphQLType(schema)

    weaverContext.memo(gqlType)
    return nullable(gqlType)
  }

  static nullishTypes: Set<string> = new Set<
    (
      | NullableSchema<any, unknown>
      | NullishSchema<any, unknown>
      | OptionalSchema<any, unknown>
    )["type"]
  >(["nullable", "nullish", "optional"])
  static toGraphQLType(
    valibotSchema: BaseSchema<unknown, unknown, BaseIssue<unknown>>
  ): GraphQLOutputType {
    const config = ValibotMetadataCollector.getFieldConfig(valibotSchema)
    if (config?.type) return config.type

    const schema = valibotSchema as SupportedSchema
    switch (schema.type) {
      case "array":
        if (ValibotSilkBuilder.nullishTypes.has(schema.item.type))
          return ValibotSilkBuilder.toGraphQLType(schema.item)
        return new GraphQLNonNull(ValibotSilkBuilder.toGraphQLType(schema.item))
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
      case "strict_object":
        throw new Error("todo") // TODO
      case "non_nullable":
      case "non_nullish":
      case "non_optional":
        return new GraphQLNonNull(
          ValibotSilkBuilder.toGraphQLType(schema.wrapped)
        )
      case "nullable":
      case "nullish":
      case "optional":
        return ValibotSilkBuilder.toGraphQLType(schema.wrapped)
      case "number":
        if (ValibotMetadataCollector.isInteger(schema)) return GraphQLInt
        return GraphQLFloat
      case "string":
        if (ValibotMetadataCollector.isID(schema)) return GraphQLID
        return GraphQLString
    }

    throw new Error(`Unsupported schema type ${schema.type}`)
  }
}

export function valibotSilk<
  TSchema extends BaseSchema<unknown, unknown, BaseIssue<unknown>>,
>(
  schema: TSchema
): TSchema & GraphQLSilk<InferOutput<TSchema>, InferInput<TSchema>> {
  return Object.assign(schema, { [SYMBOLS.GET_GRAPHQL_TYPE]: getGraphQLType })
}

function getGraphQLType(
  this: BaseSchema<unknown, unknown, BaseIssue<unknown>>
): GraphQLOutputType {
  return ValibotSilkBuilder.toNullableGraphQLType(this)
}
