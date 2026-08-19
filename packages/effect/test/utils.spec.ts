import { weaverContext } from "@gqloom/core"
import { Schema, SchemaAST } from "effect"
import {
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from "graphql"
import { describe, expect, it } from "vitest"
import { EffectWeaver } from "../src"
import {
  extractTypeName,
  getFieldConfig,
  isBooleanSchema,
  isIntegerSchema,
  isNumberSchema,
  isStringSchema,
} from "../src/utils"

describe("utils & edge coverage", () => {
  it("should keep existing GraphQLNonNull without double wrapping", () => {
    const schema = Schema.String
    const preset = new GraphQLNonNull(GraphQLString)
    // 预先写入缓存，触发 toNullableGraphQLType 的 isNonNullType 早退分支
    weaverContext.memoGraphQLType(schema.ast, preset)

    const result = (EffectWeaver as any).toNullableGraphQLType(schema)
    expect(result).toBe(preset)
    expect(result).toBeInstanceOf(GraphQLNonNull)
    // 确认没有多包一层
    expect((result as GraphQLNonNull<any>).ofType).toBe(GraphQLString)
  })

  it("should map tuple and rest tuple to list types", () => {
    const singleTuple = Schema.Tuple(Schema.String)

    const singleType = EffectWeaver.getGraphQLType(
      singleTuple
    ) as GraphQLNonNull<GraphQLList<any>>

    expect(singleType.ofType).toBeInstanceOf(GraphQLList)
    expect((singleType.ofType as GraphQLList<any>).ofType).toBeInstanceOf(
      GraphQLNonNull
    )
  })

  it("should handle suspended fields", () => {
    type Node = { name: string; next?: Node }
    const NodeSchema: Schema.Schema<Node> = Schema.Struct({
      name: Schema.String,
      next: Schema.optional(
        Schema.suspend((): Schema.Schema<Node> => NodeSchema)
      ).annotations({
        // 直接写入 DefaultAnnotationId，确保扩展字段被生成
        [SchemaAST.DefaultAnnotationId]: () => ({ name: "Bob" }),
      }),
    })
  })

  it("should collapse union with only one non-null member", () => {
    const MaybeUser = Schema.Union(
      Schema.Struct({ name: Schema.String }),
      Schema.Undefined
    )

    const type = EffectWeaver.getGraphQLType(MaybeUser)
    // Nullable union被折叠为对象类型（不再是 GraphQLUnion）
    expect(type).toBeInstanceOf(GraphQLObjectType)
  })

  it("should return empty field config for suspended property", () => {
    const Suspended = Schema.Struct({
      value: Schema.suspend(() => Schema.String),
    })
    const prop = (Suspended.ast as SchemaAST.TypeLiteral).propertySignatures[0]
    const cfg = getFieldConfig(Suspended, prop)
    expect(cfg).toEqual({})
  })

  it("should detect branded/transform/refinement base types", () => {
    const stringTransform = Schema.transform(Schema.String, Schema.Number, {
      decode: (s) => Number(s),
      encode: (n) => String(n),
    })
    const numberTransform = Schema.transform(Schema.Number, Schema.Number, {
      decode: (n) => n,
      encode: (n) => n,
    })
    const booleanTransform = Schema.transform(Schema.String, Schema.Boolean, {
      decode: (s) => s === "true",
      encode: (b) => (b ? "true" : "false"),
    })

    expect(isStringSchema(stringTransform.ast)).toBe(false)
    expect(isNumberSchema(numberTransform.ast)).toBe(true)
    expect(isBooleanSchema(booleanTransform.ast)).toBe(true)
  })

  it("should detect integer via JSONSchema annotation", () => {
    const intLike = Schema.Number.annotations({
      [SchemaAST.IdentifierAnnotationId]: "myInt",
      [SchemaAST.JSONSchemaAnnotationId]: { type: "integer" },
    })
    expect(isIntegerSchema(intLike)).toBe(true)
    const plain = Schema.Number
    expect(isIntegerSchema(plain)).toBe(false)
  })

  it("should return undefined when __typename is not a string literal", () => {
    const NoLiteral = Schema.Struct({
      __typename: Schema.Number,
      value: Schema.String,
    })
    const name = extractTypeName(NoLiteral.ast as SchemaAST.TypeLiteral)
    expect(name).toBeUndefined()
  })
})
