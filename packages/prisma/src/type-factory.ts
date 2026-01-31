import {
  type GraphQLSilk,
  isSilk,
  provideWeaverContext,
  SYMBOLS,
  silk,
  weaverContext,
} from "@gqloom/core"
import type { DMMF } from "@prisma/generator-helper"
import {
  GraphQLEnumType,
  type GraphQLEnumValueConfig,
  type GraphQLFieldConfig,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  type GraphQLOutputType,
  GraphQLScalarType,
} from "graphql"
import { PrismaWeaver } from "."
import type {
  AnyPrismaModelSilk,
  InferTModelSilkName,
  PrismaModelConfig,
  PrismaModelMeta,
  PrismaTypes,
} from "./types"
import { gqlType as gt } from "./utils"

export class PrismaTypeFactory<
  TModelSilk extends AnyPrismaModelSilk = AnyPrismaModelSilk,
> {
  protected modelMeta: Required<PrismaModelMeta>
  protected modelName: string | undefined

  public constructor(silkOrModelMeta: TModelSilk | PrismaModelMeta) {
    if (isSilk(silkOrModelMeta)) {
      this.modelMeta = PrismaTypeFactory.indexModelMeta(silkOrModelMeta.meta)
      this.modelName = silkOrModelMeta.name
    } else {
      this.modelMeta = PrismaTypeFactory.indexModelMeta(silkOrModelMeta)
    }
  }

  public getSilk<
    TName extends keyof PrismaTypes[InferTModelSilkName<TModelSilk>],
  >(
    name: TName
  ): GraphQLSilk<PrismaTypes[InferTModelSilkName<TModelSilk>][TName]> {
    if (!this.modelName)
      throw new Error(
        "Model name is not set, you should pass the silk object instead of model meta in the constructor"
      )
    const modelName = this.modelName
    return silk(() =>
      this.inputType(modelName, { inputName: String(name) })
    ) as GraphQLSilk<PrismaTypes[InferTModelSilkName<TModelSilk>][TName]>
  }

  public inputType(
    modelName: string | null,
    suffixOrConfig: string | { inputName: string }
  ): GraphQLObjectType | GraphQLScalarType {
    const name =
      typeof suffixOrConfig === "string"
        ? `${modelName}${suffixOrConfig}`
        : suffixOrConfig.inputName
    const input = this.modelMeta.inputTypes.get(name)

    if (!input) throw new Error(`Input type ${name} not found`)

    if (input.fields.length === 0) return PrismaTypeFactory.emptyInputScalar()
    const existing = weaverContext.getNamedType(name) as
      | GraphQLObjectType
      | undefined

    if (existing) return existing

    const {
      fields: fieldsGetter,
      [SYMBOLS.WEAVER_CONFIG]: _,
      ...modelConfig
    } = weaverContext.getConfig<PrismaModelConfig<any>>(
      `gqloom.prisma.model.${modelName}`
    ) ?? {}

    const fieldsConfig =
      typeof fieldsGetter === "function" ? fieldsGetter() : fieldsGetter

    return weaverContext.memoNamedType(
      new GraphQLObjectType({
        name,
        fields: provideWeaverContext.inherit(() => ({
          ...Object.fromEntries(
            input.fields
              .map((field) => {
                const isNonNull = field.isRequired && !field.isNullable
                const fieldInput = PrismaTypeFactory.getMostRankInputType(
                  field.inputTypes
                )
                const [typeGetter, options] =
                  PrismaWeaver.getFieldConfigOptions(fieldsConfig?.[field.name])

                const isList = fieldInput.isList
                let type: GraphQLOutputType | typeof SYMBOLS.FIELD_HIDDEN =
                  (() => {
                    switch (fieldInput.location) {
                      case "inputObjectTypes":
                        return this.inputType(modelName, {
                          inputName: fieldInput.type,
                        })
                      case "scalar": {
                        try {
                          return PrismaWeaver.getGraphQLTypeByField(
                            fieldInput.type,
                            typeGetter,
                            null // FIXME: should pass field
                          )
                        } catch (_err) {
                          throw new Error(
                            `Can not find GraphQL type for scalar ${fieldInput.type}`
                          )
                        }
                      }
                      case "enumTypes":
                        return this.enumType(fieldInput.type)
                      default:
                        throw new Error(
                          `Unknown input type location: ${fieldInput.location}`
                        )
                    }
                  })()

                if (type === SYMBOLS.FIELD_HIDDEN) return null

                if (isList) type = new GraphQLList(new GraphQLNonNull(type))
                if (isNonNull) type = new GraphQLNonNull(type)

                return [
                  field.name,
                  {
                    description: field.comment,
                    deprecationReason: field.deprecation?.reason,
                    type,
                    ...options,
                  } as GraphQLFieldConfig<any, any, any>,
                ]
              })
              .filter((x) => x != null)
          ),
        })),
        ...modelConfig,
      })
    )
  }

  public enumType(name: string): GraphQLEnumType {
    const enumType = this.modelMeta.enumTypes.get(name)
    if (!enumType) {
      const enumModel = this.modelMeta.enums[name]
      if (!enumModel) throw new Error(`Enum type ${name} not found`)
      return PrismaWeaver.getGraphQLEnumType(enumModel)
    }

    const existing = weaverContext.getNamedType(name) as
      | GraphQLEnumType
      | undefined

    if (existing) return existing

    return weaverContext.memoNamedType(
      new GraphQLEnumType({
        name,
        values: Object.fromEntries(
          enumType.data.map((item) => [
            item.value,
            { value: item.value } as GraphQLEnumValueConfig,
          ])
        ),
      })
    )
  }

  protected static emptyInputScalar(): GraphQLScalarType {
    const name = "EmptyInput"

    const existing = weaverContext.getNamedType(name) as
      | GraphQLScalarType
      | undefined
    if (existing) return existing

    return weaverContext.memoNamedType(
      new GraphQLScalarType({
        name,
        description: "Empty input scalar",
      })
    )
  }

  protected static getMostRankInputType(
    inputTypes: readonly DMMF.InputTypeRef[]
  ): DMMF.InputTypeRef {
    const rankList = inputTypes
      .map((item) => ({
        item,
        rank: PrismaTypeFactory.getInputTypeRank(item),
      }))
      .sort((a, b) => b.rank - a.rank)

    return rankList[0].item
  }

  protected static getInputTypeRank(inputType: DMMF.InputTypeRef): number {
    let rank = inputType.type.length
    if (inputType.isList) rank += 10
    if (inputType.type.includes("Unchecked")) rank -= 50
    if (inputType.type === "Null") rank -= Infinity
    switch (inputType.location) {
      case "scalar":
        rank += 10
        break
      case "enumTypes":
        rank += 20
        break
      case "fieldRefTypes":
        rank -= 30
        break
      case "inputObjectTypes":
        rank += 40
    }
    return rank
  }

  protected static indexModelMeta(
    modelMeta: PrismaModelMeta
  ): Required<PrismaModelMeta> {
    modelMeta.inputTypes ??= PrismaTypeFactory.indexInputTypes(modelMeta.schema)
    modelMeta.enumTypes ??= PrismaTypeFactory.indexEnumTypes(modelMeta.schema)
    return modelMeta as Required<PrismaModelMeta>
  }

  protected static indexInputTypes(
    schema: DMMF.Schema
  ): Map<string, DMMF.InputType> {
    const map = new Map<string, DMMF.InputType>()
    for (const inputType of schema.inputObjectTypes.prisma ?? []) {
      map.set(inputType.name, inputType)
    }
    return map
  }

  protected static indexEnumTypes(
    schema: DMMF.Schema
  ): Map<string, DMMF.SchemaEnum> {
    const map = new Map<string, DMMF.SchemaEnum>()
    for (const enumType of schema.enumTypes.prisma ?? []) {
      // Convert from old format { name, values: string[] } to new format { name, data: { key, value }[] }
      const convertedEnum: DMMF.SchemaEnum = {
        name: enumType.name,
        data:
          (enumType as any).data ??
          (enumType as any).values?.map((value: string) => ({
            key: value,
            value: value,
          })) ??
          [],
      }
      map.set(enumType.name, convertedEnum)
    }
    return map
  }
}

export class PrismaActionArgsFactory<
  TModelSilk extends AnyPrismaModelSilk = AnyPrismaModelSilk,
> extends PrismaTypeFactory<TModelSilk> {
  public constructor(protected readonly silk: TModelSilk) {
    super(silk.meta)
  }

  protected getModel(modelOrName?: string | DMMF.Model): DMMF.Model {
    if (modelOrName == null) return this.silk.model
    if (typeof modelOrName === "object") return modelOrName
    const model = this.silk.meta.models[modelOrName]
    if (model == null) throw new Error(`Model ${modelOrName} not found`)
    return model
  }

  public countArgs(modelName?: string | DMMF.Model): GraphQLObjectType {
    const model = this.getModel(modelName)
    const name = `${model.name}CountArgs`

    const existing = weaverContext.getNamedType(name)
    if (existing) return existing as GraphQLObjectType

    const input: GraphQLObjectType = new GraphQLObjectType({
      name,
      fields: provideWeaverContext.inherit(() => ({
        where: { type: this.inputType(model.name, "WhereInput") },
        orderBy: {
          type: gt.list(this.inputType(model.name, "OrderByWithRelationInput")),
        },
        cursor: { type: this.inputType(model.name, "WhereUniqueInput") },
        skip: { type: gt.int },
        take: { type: gt.int },
      })),
    })

    return weaverContext.memoNamedType(input)
  }

  public findFirstArgs(modelName?: string | DMMF.Model): GraphQLObjectType {
    const model = this.getModel(modelName)
    const name = `${model.name}FindFirstArgs`

    const existing = weaverContext.getNamedType(name)
    if (existing) return existing as GraphQLObjectType

    const input: GraphQLObjectType = new GraphQLObjectType({
      name,
      fields: provideWeaverContext.inherit(() => ({
        where: { type: this.inputType(model.name, "WhereInput") },
        orderBy: {
          type: gt.list(this.inputType(model.name, "OrderByWithRelationInput")),
        },
        cursor: { type: this.inputType(model.name, "WhereUniqueInput") },
        skip: { type: gt.int },
        take: { type: gt.int },
        distinct: {
          type: gt.list(this.enumType(`${model.name}ScalarFieldEnum`)),
        },
      })),
    })

    return weaverContext.memoNamedType(input)
  }

  public findManyArgs(modelName?: string | DMMF.Model): GraphQLObjectType {
    const model = this.getModel(modelName)
    const name = `${model.name}FindManyArgs`

    const existing = weaverContext.getNamedType(name)
    if (existing) return existing as GraphQLObjectType

    const input: GraphQLObjectType = new GraphQLObjectType({
      name,
      fields: provideWeaverContext.inherit(() => ({
        where: { type: this.inputType(model.name, "WhereInput") },
        orderBy: {
          type: gt.list(this.inputType(model.name, "OrderByWithRelationInput")),
        },
        cursor: { type: this.inputType(model.name, "WhereUniqueInput") },
        skip: { type: gt.int },
        take: { type: gt.int },
        distinct: {
          type: gt.list(this.enumType(`${model.name}ScalarFieldEnum`)),
        },
      })),
    })

    return weaverContext.memoNamedType(input)
  }

  public findUniqueArgs(modelName?: string | DMMF.Model): GraphQLObjectType {
    const model = this.getModel(modelName)
    const name = `${model.name}FindUniqueArgs`

    const existing = weaverContext.getNamedType(name)
    if (existing) return existing as GraphQLObjectType

    const input: GraphQLObjectType = new GraphQLObjectType({
      name,
      fields: provideWeaverContext.inherit(() => ({
        where: { type: this.inputType(model.name, "WhereUniqueInput") },
      })),
    })

    return weaverContext.memoNamedType(input)
  }

  public createArgs(modelName?: string | DMMF.Model): GraphQLObjectType {
    const model = this.getModel(modelName)
    const name = `${model.name}CreateArgs`

    const existing = weaverContext.getNamedType(name)
    if (existing) return existing as GraphQLObjectType

    const input: GraphQLObjectType = new GraphQLObjectType({
      name,
      fields: provideWeaverContext.inherit(() => ({
        data: {
          type: gt.nonNull(this.inputType(model.name, "CreateInput")),
        },
      })),
    })
    return weaverContext.memoNamedType(input)
  }

  public createManyArgs(modelName?: string | DMMF.Model): GraphQLObjectType {
    const model = this.getModel(modelName)
    const name = `${model.name}CreateManyArgs`

    const existing = weaverContext.getNamedType(name)
    if (existing) return existing as GraphQLObjectType

    const input: GraphQLObjectType = new GraphQLObjectType({
      name,
      fields: provideWeaverContext.inherit(() => ({
        data: {
          type: gt.nonNull(
            gt.list(this.inputType(model.name, "CreateManyInput"))
          ),
        },
      })),
    })
    return weaverContext.memoNamedType(input)
  }

  public deleteArgs(modelName?: string | DMMF.Model): GraphQLObjectType {
    const model = this.getModel(modelName)
    const name = `${model.name}DeleteArgs`

    const existing = weaverContext.getNamedType(name)
    if (existing) return existing as GraphQLObjectType

    const input: GraphQLObjectType = new GraphQLObjectType({
      name,
      fields: provideWeaverContext.inherit(() => ({
        where: {
          type: gt.nonNull(this.inputType(model.name, "WhereUniqueInput")),
        },
      })),
    })

    return weaverContext.memoNamedType(input)
  }

  public deleteManyArgs(modelName?: string | DMMF.Model): GraphQLObjectType {
    const model = this.getModel(modelName)
    const name = `${model.name}DeleteManyArgs`

    const existing = weaverContext.getNamedType(name)
    if (existing) return existing as GraphQLObjectType

    const input: GraphQLObjectType = new GraphQLObjectType({
      name,
      fields: provideWeaverContext.inherit(() => ({
        where: { type: this.inputType(model.name, "WhereInput") },
      })),
    })

    return weaverContext.memoNamedType(input)
  }

  public updateArgs(modelName?: string | DMMF.Model): GraphQLObjectType {
    const model = this.getModel(modelName)
    const name = `${model.name}UpdateArgs`

    const existing = weaverContext.getNamedType(name)
    if (existing) return existing as GraphQLObjectType

    const input: GraphQLObjectType = new GraphQLObjectType({
      name,
      fields: provideWeaverContext.inherit(() => ({
        data: {
          type: gt.nonNull(this.inputType(model.name, "UpdateInput")),
        },
        where: {
          type: gt.nonNull(this.inputType(model.name, "WhereUniqueInput")),
        },
      })),
    })
    return weaverContext.memoNamedType(input)
  }

  public updateManyArgs(modelName?: string | DMMF.Model): GraphQLObjectType {
    const model = this.getModel(modelName)
    const name = `${model.name}UpdateManyArgs`

    const existing = weaverContext.getNamedType(name)
    if (existing) return existing as GraphQLObjectType

    const input: GraphQLObjectType = new GraphQLObjectType({
      name,
      fields: provideWeaverContext.inherit(() => ({
        data: {
          type: gt.nonNull(
            this.inputType(model.name, "UpdateManyMutationInput")
          ),
        },
        where: { type: this.inputType(model.name, "WhereInput") },
      })),
    })

    return weaverContext.memoNamedType(input)
  }

  public upsertArgs(modelName?: string | DMMF.Model): GraphQLObjectType {
    const model = this.getModel(modelName)
    const name = `${model.name}UpsertArgs`

    const existing = weaverContext.getNamedType(name)
    if (existing) return existing as GraphQLObjectType

    const input: GraphQLObjectType = new GraphQLObjectType({
      name,
      fields: provideWeaverContext.inherit(() => ({
        where: {
          type: gt.nonNull(this.inputType(model.name, "WhereUniqueInput")),
        },
        create: {
          type: gt.nonNull(this.inputType(model.name, "CreateInput")),
        },
        update: {
          type: gt.nonNull(this.inputType(model.name, "UpdateInput")),
        },
      })),
    })
    return weaverContext.memoNamedType(input)
  }

  public static batchPayload(): GraphQLObjectType {
    const name = "BatchPayload"
    const existing = weaverContext.getNamedType(name)
    if (existing) return existing as GraphQLObjectType
    const input: GraphQLObjectType = new GraphQLObjectType({
      name,
      fields: provideWeaverContext.inherit(() => ({
        count: { type: gt.nonNull(gt.int) },
      })),
    })

    return weaverContext.memoNamedType(input)
  }
}

/**
 * @deprecated Use PrismaTypeFactory instead
 */
export const PrismaTypeWeaver = PrismaTypeFactory

/**
 * @deprecated Use PrismaActionArgsFactory instead
 */
export const PrismaActionArgsWeaver = PrismaActionArgsFactory
