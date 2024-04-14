import {
  type GraphQLSilk,
  createLoom,
  mapValue,
  ensureInterfaceType,
  weaverContext,
} from "@gqloom/core"
import {
  GraphQLString,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLObjectType,
  type GraphQLOutputType,
  type GraphQLFieldConfig,
  GraphQLList,
  GraphQLEnumType,
  type GraphQLEnumValueConfigMap,
  type ThunkReadonlyArray,
  type GraphQLInterfaceType,
  isObjectType,
  GraphQLUnionType,
  isUnionType,
  isNonNullType,
} from "graphql"
import {
  type SchemaDescription,
  isSchema,
  type InferType,
  type Schema,
  type SchemaObjectDescription,
  type SchemaFieldDescription,
  type SchemaInnerTypeDescription,
} from "yup"
import { type GQLoomMetadata } from "./types"

export * from "./types"
export * from "./union"

export class YupSilk<TSchema extends Schema>
  implements GraphQLSilk<InferType<TSchema>, InferType<TSchema>>
{
  _types?: { input: InferType<TSchema>; output: InferType<TSchema> }
  schemaDescription: SchemaDescription
  nonNull: boolean

  constructor(public schema: TSchema) {
    this.schemaDescription = schema.describe()
    this.nonNull =
      !this.schemaDescription.nullable && !this.schemaDescription.optional
  }

  getType() {
    return YupSilk.getTypeByDescription(this.schemaDescription)
  }

  parse(input: InferType<TSchema>): Promise<InferType<TSchema>> {
    return this.schema.validate(input)
  }

  static getTypeByDescription(description: SchemaDescription) {
    // use existing type first
    switch (description.type) {
      case "object": {
        const name = description.meta?.name ?? description.label
        if (!name) throw new Error("object type must have a name")
        const existing = weaverContext.objectMap?.get(name)
        if (existing) return nullable(existing)
        break
      }
      case "union": {
        const name = description.meta?.name ?? description.label
        if (!name) throw new Error("union type must have a name")
        const existing = weaverContext.unionMap?.get(name)
        if (existing) return nullable(existing)
        break
      }
    }

    const gqlType = YupSilk.getGraphQLType(description)

    // do not forget to keep the type
    if (isObjectType(gqlType)) {
      weaverContext.objectMap?.set(gqlType.name, gqlType)
    } else if (isUnionType(gqlType)) {
      weaverContext.unionMap?.set(gqlType.name, gqlType)
    }
    return nullable(gqlType)

    function nullable(ofType: GraphQLOutputType) {
      if (description.nullable || description.optional) return ofType
      if (isNonNullType(ofType)) return ofType
      return new GraphQLNonNull(ofType)
    }
  }

  static getNullableType(description: SchemaDescription) {
    const ofType = YupSilk.getGraphQLType(description)
    if (description.nullable || description.optional) return ofType
    return new GraphQLNonNull(ofType)
  }

  static getGraphQLType(description: SchemaDescription): GraphQLOutputType {
    const maybeEnum = YupSilk.getEnumType(description)
    if (maybeEnum) return maybeEnum

    switch (description.type) {
      case "string":
        return GraphQLString
      case "number": {
        if (
          (description as SchemaDescription).tests.some(
            (t: { name?: string }) => t?.name === "integer"
          )
        )
          return GraphQLInt
        return GraphQLFloat
      }
      case "boolean":
        return GraphQLBoolean
      case "date":
        return GraphQLString
      case "object": {
        const name = description.meta?.name ?? description.label ?? ""
        return new GraphQLObjectType({
          isTypeOf: description.meta?.isTypeOf,
          interfaces: YupSilk.ensureInterfaceTypes(
            description.meta?.interfaces
          ),
          name,
          description: description.meta?.description,
          fields: mapValue(
            (description as SchemaObjectDescription).fields,
            (fieldDescription) => {
              const d = YupSilk.ensureSchemaDescription(fieldDescription)
              return {
                type: YupSilk.getTypeByDescription(d),
                description: d?.meta?.description,
              } as GraphQLFieldConfig<any, any>
            }
          ),
        })
      }
      case "array": {
        const innerType = (description as SchemaInnerTypeDescription).innerType
        if (Array.isArray(innerType))
          throw new Error("Array type cannot have multiple inner types")

        if (innerType == null)
          throw new Error("Array type must have an inner type")

        return new GraphQLList(
          YupSilk.getTypeByDescription(
            YupSilk.ensureSchemaDescription(innerType)
          )
        )
      }

      case "union": {
        const innerType = (description as SchemaInnerTypeDescription).innerType
        if (innerType == null)
          throw new Error("Union type must have inner types")

        const innerTypes = Array.isArray(innerType) ? innerType : [innerType]

        const name = description.meta?.name ?? description.label ?? ""

        const types = () =>
          innerTypes.map((innerType) => {
            const gqlType = YupSilk.getTypeByDescription(
              YupSilk.ensureSchemaDescription(innerType)
            )
            if (isObjectType(gqlType)) return gqlType
            throw new Error(
              `Union types ${name} can only contain objects, but got ${gqlType}`
            )
          })

        return new GraphQLUnionType({
          name,
          types,
          description: description.meta?.description,
          resolveType: description.meta?.resolveType,
        })
      }
      default:
        throw new Error(`yup type ${description.type} is not supported`)
    }
  }

  static ensureSchemaDescription(
    description: SchemaFieldDescription
  ): SchemaDescription {
    if (description.type === "lazy")
      throw new Error("lazy type is not supported")
    return description as SchemaDescription
  }

  static ensureInterfaceTypes(
    thunkList: ThunkReadonlyArray<Schema> | undefined
  ): ReadonlyArray<GraphQLInterfaceType> | undefined {
    if (thunkList == null) return undefined
    const list = typeof thunkList === "function" ? thunkList() : thunkList

    return list.map((yupSchema) =>
      ensureInterfaceType(new YupSilk(yupSchema).getType())
    )
  }

  static getEnumType(description: SchemaDescription): GraphQLEnumType | null {
    if (!description.oneOf.length) return null

    const meta: GQLoomMetadata | undefined = description.meta

    const values: GraphQLEnumValueConfigMap = {}

    if (meta?.enum) {
      Object.entries(meta.enum).forEach(([key, value]) => {
        if (typeof meta.enum?.[meta.enum[key]] === "number") return
        const config = meta?.enumValues?.[key]
        if (typeof config === "object") values[key] = config
        else values[key] = { value, description: config }
      })
    } else {
      description.oneOf.forEach((value) => {
        const key = String(value)
        const config = meta?.enumValues?.[key]
        if (typeof config === "object") values[key] = config
        else values[key] = { value, description: config }
      })
    }

    return new GraphQLEnumType({
      name: meta?.name ?? description.label ?? "",
      description: meta?.description,
      values,
    })
  }
}

export type YupSchemaIO = [Schema, "__outputType", "__outputType"]

export function yupSilk<TSchema extends Schema>(
  schema: TSchema
): YupSilk<TSchema> {
  return new YupSilk(schema)
}

export const { query, mutation, field, resolver } = createLoom<YupSchemaIO>(
  yupSilk,
  isSchema
)
