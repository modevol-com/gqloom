import { type DMMF } from "@prisma/generator-helper"
import { PrismaWeaver } from "."
import { type PrismaModelSilk, type PrismaModelMeta } from "./types"
import { weaverContext } from "@gqloom/core"
import {
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  type GraphQLOutputType,
  type GraphQLFieldConfig,
  GraphQLEnumType,
  type GraphQLEnumValueConfig,
} from "graphql"
import { gqlType } from "./utils"

export class PrismaTypeWeaver {
  protected modelMeta: Required<PrismaModelMeta>

  constructor(modelMeta: PrismaModelMeta) {
    this.modelMeta = PrismaTypeWeaver.indexModelMeta(modelMeta)
  }

  public inputType(name: string): GraphQLObjectType {
    const input = this.modelMeta.inputTypes.get(name)
    if (!input) throw new Error(`Input type ${name} not found`)
    const existing = weaverContext.getNamedType(name) as
      | GraphQLObjectType
      | undefined

    if (existing) return existing

    return weaverContext.memoNamedType(
      new GraphQLObjectType({
        name,
        fields: () => ({
          ...Object.fromEntries(
            input.fields.map((field) => {
              const isNonNull = field.isRequired && !field.isNullable
              const fieldInput = PrismaTypeWeaver.getMostRankInputType(
                field.inputTypes
              )

              const isList = fieldInput.isList
              let type: GraphQLOutputType = (() => {
                switch (fieldInput.location) {
                  case "inputObjectTypes":
                    return this.inputType(fieldInput.type)
                  case "scalar": {
                    const t = PrismaWeaver.getGraphQLTypeByField(
                      fieldInput.type
                    )
                    if (!t)
                      throw new Error(
                        `Can not find GraphQL type for scalar ${fieldInput.type}`
                      )
                    return t
                  }
                  case "enumTypes":
                    return this.enumType(fieldInput.type)
                  default:
                    throw new Error(
                      `Unknown input type location: ${fieldInput.location}`
                    )
                }
              })()

              if (isList) type = new GraphQLList(new GraphQLNonNull(type))
              if (isNonNull) type = new GraphQLNonNull(type)

              return [
                field.name,
                {
                  description: field.comment,
                  deprecationReason: field.deprecation?.reason,
                  type,
                } as GraphQLFieldConfig<any, any, any>,
              ]
            })
          ),
        }),
      })
    )
  }

  public enumType(name: string): GraphQLEnumType {
    const enumType = this.modelMeta.enumTypes.get(name)
    if (!enumType) throw new Error(`Enum type ${name} not found`)

    const existing = weaverContext.getNamedType(name) as
      | GraphQLEnumType
      | undefined

    if (existing) return existing

    return weaverContext.memoNamedType(
      new GraphQLEnumType({
        name,
        values: Object.fromEntries(
          enumType.values.map((value) => [
            value,
            { value } as GraphQLEnumValueConfig,
          ])
        ),
      })
    )
  }

  protected static getMostRankInputType(
    inputTypes: readonly DMMF.InputTypeRef[]
  ): DMMF.InputTypeRef {
    const rankList = inputTypes
      .map((item) => ({
        item,
        rank: PrismaTypeWeaver.getInputTypeRank(item),
      }))
      .sort((a, b) => b.rank - a.rank)

    return rankList[0].item
  }

  protected static getInputTypeRank(inputType: DMMF.InputTypeRef): number {
    let rank = inputType.type.length
    if (inputType.isList) rank += 10
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
    modelMeta.inputTypes ??= PrismaTypeWeaver.indexInputTypes(modelMeta.schema)
    modelMeta.enumTypes ??= PrismaTypeWeaver.indexEnumTypes(modelMeta.schema)
    return modelMeta as Required<PrismaModelMeta>
  }

  protected static indexInputTypes(
    schema: DMMF.Schema
  ): Map<string, DMMF.InputType> {
    const map = new Map<string, DMMF.InputType>()
    for (const inputType of schema.inputObjectTypes.prisma) {
      map.set(inputType.name, inputType)
    }
    return map
  }

  protected static indexEnumTypes(
    schema: DMMF.Schema
  ): Map<string, DMMF.SchemaEnum> {
    const map = new Map<string, DMMF.SchemaEnum>()
    for (const enumType of schema.enumTypes.prisma) {
      map.set(enumType.name, enumType)
    }
    return map
  }
}

export class PrismaActionArgsWeaver extends PrismaTypeWeaver {
  constructor(protected readonly silk: PrismaModelSilk<any>) {
    super(silk.data)
  }

  protected getModel(modelOrName?: string | DMMF.Model): DMMF.Model {
    if (modelOrName == null) return this.silk.model
    if (typeof modelOrName === "object") return modelOrName
    const model = this.silk.data.models[modelOrName]
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
      fields: () => ({
        where: { type: this.inputType(`${model.name}WhereInput`) },
        orderBy: {
          type: gqlType.list(
            this.inputType(`${model.name}OrderByWithRelationInput`)
          ),
        },
        cursor: { type: this.inputType(`${model.name}WhereUniqueInput`) },
        skip: { type: gqlType.int },
        take: { type: gqlType.int },
      }),
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
      fields: () => ({
        where: { type: this.inputType(`${model.name}WhereInput`) },
        orderBy: {
          type: gqlType.list(
            this.inputType(`${model.name}OrderByWithRelationInput`)
          ),
        },
        cursor: { type: this.inputType(`${model.name}WhereUniqueInput`) },
        skip: { type: gqlType.int },
        take: { type: gqlType.int },
        distinct: {
          type: gqlType.list(this.enumType(`${model.name}ScalarFieldEnum`)),
        },
      }),
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
      fields: () => ({
        where: { type: this.inputType(`${model.name}WhereInput`) },
        orderBy: {
          type: gqlType.list(
            this.inputType(`${model.name}OrderByWithRelationInput`)
          ),
        },
        cursor: { type: this.inputType(`${model.name}WhereUniqueInput`) },
        skip: { type: gqlType.int },
        take: { type: gqlType.int },
        distinct: {
          type: gqlType.list(this.enumType(`${model.name}ScalarFieldEnum`)),
        },
      }),
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
      fields: () => ({
        where: { type: this.inputType(`${model.name}WhereUniqueInput`) },
      }),
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
      fields: () => ({
        data: {
          type: gqlType.nonNull(this.inputType(`${model.name}CreateInput`)),
        },
      }),
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
      fields: () => ({
        data: {
          type: gqlType.nonNull(
            gqlType.list(this.inputType(`${model.name}CreateManyInput`))
          ),
        },
      }),
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
      fields: () => ({
        where: {
          type: gqlType.nonNull(
            this.inputType(`${model.name}WhereUniqueInput`)
          ),
        },
      }),
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
      fields: () => ({
        where: { type: this.inputType(`${model.name}WhereInput`) },
      }),
    })

    return weaverContext.memoNamedType(input)
  }

  // TODO: updateArgs
  // TODO: updateManyArgs
  // TODO: upsertArgs
}
