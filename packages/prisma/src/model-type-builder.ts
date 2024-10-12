import { type DMMF } from "@prisma/generator-helper"
import { PrismaWeaver } from "."
import { type PrismaDataModel, type PrismaModelSilk } from "./types"
import { weaverContext, notNullish } from "@gqloom/core"
import {
  GraphQLEnumType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  type GraphQLOutputType,
  GraphQLScalarType,
  GraphQLString,
  GraphQLFloat,
} from "graphql"
import { capitalize } from "./utils"

export class PrismaModelTypeBuilder<
  TModalSilk extends PrismaModelSilk<any, any>,
> {
  protected modelData: PrismaDataModel
  constructor(protected readonly silk: TModalSilk) {
    this.modelData = silk.data
  }

  protected getModel(modelOrName?: string | DMMF.Model): DMMF.Model {
    if (modelOrName == null) return this.silk.model
    if (typeof modelOrName === "object") return modelOrName
    const model = this.silk.data.models[modelOrName]
    if (model == null) throw new Error(`Model ${modelOrName} not found`)
    return model
  }

  public static scalarFilter(scalar: GraphQLScalarType): GraphQLObjectType {
    const existing = weaverContext.getGraphQLType(scalar)
    if (existing) return existing as GraphQLObjectType
    const filter: GraphQLObjectType = new GraphQLObjectType({
      name: `${scalar.name}Filter`,
      fields: () => ({
        equals: { type: scalar },
        in: { type: new GraphQLList(new GraphQLNonNull(scalar)) },
        notIn: { type: new GraphQLList(new GraphQLNonNull(scalar)) },
        lt: { type: scalar },
        lte: { type: scalar },
        gt: { type: scalar },
        gte: { type: scalar },
        not: { type: filter },
        ...(scalar === GraphQLString && {
          contains: { type: scalar },
          startsWith: { type: scalar },
          endsWith: { type: scalar },
        }),
      }),
    })
    return weaverContext.memoGraphQLType(scalar, filter)
  }

  public static sortOrder(): GraphQLEnumType {
    const existing = weaverContext.getNamedType("SortOrder")
    if (existing) return existing as GraphQLEnumType

    const sortOrder = new GraphQLEnumType({
      name: "SortOrder",
      values: { asc: { value: "asc" }, desc: { value: "desc" } },
    })
    return weaverContext.memoNamedType(sortOrder)
  }

  public static batchPayload(): GraphQLObjectType {
    const existing = weaverContext.getNamedType("BatchPayload")
    if (existing) return existing as GraphQLObjectType

    const batchPayload = new GraphQLObjectType({
      name: "BatchPayload",
      fields: () => ({
        count: { type: new GraphQLNonNull(GraphQLInt) },
      }),
    })

    return weaverContext.memoNamedType(batchPayload)
  }

  public static fieldUpdateOperationsInput(
    scalar: GraphQLScalarType
  ): GraphQLObjectType {
    const existing = weaverContext.getGraphQLType(scalar)
    if (existing) return existing as GraphQLObjectType

    const fieldUpdateOperationsInput = new GraphQLObjectType({
      name: `${scalar.name}FieldUpdateOperationsInput`,
      fields: () => ({
        set: { type: scalar },
        ...((scalar === GraphQLInt || scalar === GraphQLFloat) && {
          increment: { type: scalar },
          decrement: { type: scalar },
          multiply: { type: GraphQLFloat },
          divide: { type: GraphQLFloat },
        }),
      }),
    })

    return weaverContext.memoGraphQLType(scalar, fieldUpdateOperationsInput)
  }

  public scalarFieldEnum(modelOrName?: string | DMMF.Model): GraphQLEnumType {
    const model = this.getModel(modelOrName)
    const name = `${model.name}ScalarFieldEnum`

    const existing = weaverContext.getNamedType(name)
    if (existing) return existing as GraphQLEnumType

    const fieldEnum = new GraphQLEnumType({
      name,
      values: Object.fromEntries(
        model.fields
          .map((field) => {
            if (field.kind !== "scalar" && field.kind !== "enum") return
            return [
              field.name,
              { value: field.name, description: field.documentation },
            ]
          })
          .filter(notNullish)
      ),
    })

    return weaverContext.memoNamedType(fieldEnum)
  }

  public primaryKeyInput(
    modelOrName?: string | DMMF.Model
  ): GraphQLObjectType | null {
    const model = this.getModel(modelOrName)
    if (model.primaryKey == null) return null

    let primaryKeyName =
      model.primaryKey.name ?? model.primaryKey.fields.join("_")

    primaryKeyName =
      primaryKeyName.slice(0, 1).toUpperCase() + primaryKeyName.slice(1)

    const name = `${model.name}${primaryKeyName}Input`

    const existing = weaverContext.getNamedType(name)
    if (existing) return existing as GraphQLObjectType

    const primaryKey = model.primaryKey
    const input: GraphQLObjectType = new GraphQLObjectType({
      name,
      fields: () => ({
        ...Object.fromEntries(
          primaryKey.fields
            .map((name) => {
              const f = model.fields.find((f) => f.name === name)
              if (f == null) return
              const scalar = PrismaWeaver.getGraphQLTypeByField(f)
              if (scalar == null) return
              if (!(scalar instanceof GraphQLScalarType)) return
              return [f.name, { type: scalar }]
            })
            .filter(notNullish)
        ),
      }),
    })
    return weaverContext.memoNamedType(input)
  }

  public whereInput({
    unique,
    model: modelName,
  }: {
    unique?: boolean
    model?: string | DMMF.Model
  } = {}): GraphQLObjectType {
    const model = this.getModel(modelName)
    const name = unique
      ? `${model.name}WhereUniqueInput`
      : `${model.name}WhereInput`

    const existing = weaverContext.getNamedType(name)
    if (existing) return existing as GraphQLObjectType
    const input: GraphQLObjectType = new GraphQLObjectType({
      name,
      fields: () => ({
        AND: {
          type: new GraphQLList(new GraphQLNonNull(this.whereInput({ model }))),
        },
        OR: {
          type: new GraphQLList(new GraphQLNonNull(this.whereInput({ model }))),
        },
        NOT: {
          type: new GraphQLList(new GraphQLNonNull(this.whereInput({ model }))),
        },
        ...Object.fromEntries(
          model.fields
            .filter((f) => f.kind === "scalar")
            .map((f) => {
              const scalar = PrismaWeaver.getGraphQLTypeByField(f)
              if (scalar == null) return
              if (!(scalar instanceof GraphQLScalarType)) return

              if (unique && (f.isId || f.isUnique))
                return [f.name, { type: scalar }]
              return [
                f.name,
                { type: PrismaModelTypeBuilder.scalarFilter(scalar) },
              ]
            })
            .filter(notNullish)
        ),
        ...Object.fromEntries(
          model.fields
            .filter((f) => f.kind === "object")
            .map((f) => {
              const fieldModel = this.getModel(f.type)
              return [
                f.name,
                {
                  type: f.isList
                    ? this.listRelationFilter(fieldModel)
                    : this.whereInput({ model: fieldModel }),
                },
              ]
            })
            .filter(notNullish)
        ),
        ...(unique &&
          model.primaryKey && {
            [model.primaryKey.name ?? model.primaryKey.fields.join("_")]: {
              type: this.primaryKeyInput(model),
            },
          }),
      }),
    })
    return weaverContext.memoNamedType(input)
  }

  public listRelationFilter(
    modelName?: string | DMMF.Model
  ): GraphQLObjectType {
    const model = this.getModel(modelName)
    const name = `${model.name}ListRelationFilter`

    const existing = weaverContext.getNamedType(name)
    if (existing) return existing as GraphQLObjectType

    const input: GraphQLObjectType = new GraphQLObjectType({
      name,
      fields: () => ({
        every: { type: this.whereInput({ model }) },
        some: { type: this.whereInput({ model }) },
        none: { type: this.whereInput({ model }) },
      }),
    })
    return weaverContext.memoNamedType(input)
  }

  public orderByWithRelationInput(
    modelName?: string | DMMF.Model
  ): GraphQLObjectType {
    const model = this.getModel(modelName)
    const name = `${model.name}OrderByWithRelationInput`
    const existing = weaverContext.getNamedType(name)
    if (existing) return existing as GraphQLObjectType

    const input: GraphQLObjectType = new GraphQLObjectType({
      name,
      fields: () => ({
        ...Object.fromEntries(
          model.fields
            .map((f) => {
              if (f.kind === "scalar") {
                return [f.name, { type: PrismaModelTypeBuilder.sortOrder() }]
              }
              if (f.kind === "object") {
                if (f.isList) {
                  return [
                    f.name,
                    { type: this.orderByRelationAggregateInput(f.type) },
                  ]
                }
                return [f.name, { type: this.orderByWithRelationInput(f.type) }]
              }
            })
            .filter(notNullish)
        ),
      }),
    })

    return weaverContext.memoNamedType(input)
  }

  public orderByRelationAggregateInput(
    modelName?: string | DMMF.Model
  ): GraphQLObjectType {
    const model = this.getModel(modelName)
    const name = `${model.name}OrderByRelationAggregateInput`
    const existing = weaverContext.getNamedType(name)
    if (existing) return existing as GraphQLObjectType

    const input: GraphQLObjectType = new GraphQLObjectType({
      name,
      fields: () => ({
        _count: { type: PrismaModelTypeBuilder.sortOrder() },
      }),
    })

    return weaverContext.memoNamedType(input)
  }

  public countArgs(modelName?: string | DMMF.Model): GraphQLObjectType {
    const model = this.getModel(modelName)
    const name = `${model.name}CountQueryInput`

    const existing = weaverContext.getNamedType(name)
    if (existing) return existing as GraphQLObjectType

    const input: GraphQLObjectType = new GraphQLObjectType({
      name,
      fields: () => ({
        where: { type: this.whereInput({ model }) },
        orderBy: { type: this.orderByWithRelationInput(model) },
        cursor: { type: this.whereInput({ model, unique: true }) },
        skip: { type: GraphQLInt },
        take: { type: GraphQLInt },
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
        where: { type: this.whereInput({ model }) },
        orderBy: { type: this.orderByWithRelationInput(model) },
        cursor: { type: this.whereInput({ model, unique: true }) },
        skip: { type: GraphQLInt },
        take: { type: GraphQLInt },
        distinct: { type: new GraphQLList(this.scalarFieldEnum(model)) },
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
        where: { type: this.whereInput({ model }) },
        orderBy: { type: this.orderByWithRelationInput(model) },
        cursor: { type: this.whereInput({ model, unique: true }) },
        skip: { type: GraphQLInt },
        take: { type: GraphQLInt },
        distinct: { type: new GraphQLList(this.scalarFieldEnum(model)) },
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
        where: {
          type: new GraphQLNonNull(this.whereInput({ model, unique: true })),
        },
      }),
    })
    return weaverContext.memoNamedType(input)
  }

  public createNestedInput({
    model: modelName,
    without,
    many,
  }: {
    model?: string | DMMF.Model
    without: string
    many?: boolean
  }): GraphQLObjectType {
    const model = this.getModel(modelName)

    const oneOrMany = many ? "Many" : "One"
    const name = `${model.name}CreateNested${oneOrMany}Without${capitalize(without)}Input`

    const existing = weaverContext.getNamedType(name)
    if (existing) return existing as GraphQLObjectType

    const input: GraphQLObjectType = new GraphQLObjectType({
      name,
      fields: () => {
        let createInput: GraphQLOutputType = this.createInput({
          model,
          without,
        })
        if (many) createInput = new GraphQLList(new GraphQLNonNull(createInput))

        let connectInput: GraphQLOutputType = this.whereInput({
          model,
          unique: true,
        })

        if (many)
          connectInput = new GraphQLList(new GraphQLNonNull(connectInput))
        return {
          create: { type: createInput },
          connect: { type: connectInput },
        }
      },
    })
    return weaverContext.memoNamedType(input)
  }

  public createInput({
    model: modelName,
    without,
  }: {
    model?: string | DMMF.Model
    without?: string
  } = {}): GraphQLObjectType {
    const model = this.getModel(modelName)
    const withoutName = without ? `Without${capitalize(without)}` : ""
    const name = `${model.name}Create${withoutName}Input`

    const existing = weaverContext.getNamedType(name)
    if (existing) return existing as GraphQLObjectType

    const withoutFields = new Set(without ? [without] : [])

    if (without) {
      model.fields
        .filter((f) => f.kind === "object")
        .forEach((field) => {
          if (field.name !== without) return
          withoutFields.add(field.name)
          if (field.relationFromFields == null) return
          for (const f of field.relationFromFields) {
            withoutFields.add(f)
          }
        })
    }

    const input: GraphQLObjectType = new GraphQLObjectType({
      name,
      fields: () =>
        Object.fromEntries([
          ...model.fields
            .filter((f) => f.kind === "scalar")
            .map((field) => {
              if (withoutFields.has(field.name)) return
              const scalar = PrismaWeaver.getGraphQLTypeByField(field)
              if (scalar == null) return
              const isOptional = !field.isRequired || field.hasDefaultValue
              const type = isOptional ? scalar : new GraphQLNonNull(scalar)
              return [field.name, { type }]
            })
            .filter(notNullish),
          ...model.fields
            .filter((f) => f.kind === "object")
            .map((field) => {
              if (withoutFields.has(field.name)) return
              const fieldModel = this.getModel(field.type)
              const relationField = fieldModel.fields.find(
                (f) => f.relationName === field.relationName
              )
              if (relationField == null) return
              return [
                field.name,
                {
                  type: this.createNestedInput({
                    model: fieldModel,
                    without: relationField.name,
                    many: field.isList,
                  }),
                },
              ]
            })
            .filter(notNullish),
        ]),
    })
    return weaverContext.memoNamedType(input)
  }

  public createArgs(modelOrName?: string | DMMF.Model): GraphQLObjectType {
    const model = this.getModel(modelOrName)
    const name = `${model.name}CreateArgs`
    const existing = weaverContext.getNamedType(name)
    if (existing) return existing as GraphQLObjectType

    const input = new GraphQLObjectType({
      name,
      fields: () => ({
        data: {
          type: new GraphQLNonNull(this.createInput({ model })),
        },
      }),
    })
    return weaverContext.memoNamedType(input)
  }

  public createManyInput(modelOrName?: string | DMMF.Model): GraphQLObjectType {
    const model = this.getModel(modelOrName)
    const name = `${model.name}CreateManyInput`
    const existing = weaverContext.getNamedType(name)
    if (existing) return existing as GraphQLObjectType

    const input = new GraphQLObjectType({
      name,
      fields: () =>
        Object.fromEntries(
          model.fields
            .filter((f) => f.kind === "scalar")
            .map((field) => {
              const scalar = PrismaWeaver.getGraphQLTypeByField(field)
              if (scalar == null) return
              const isOptional = !field.isRequired || field.hasDefaultValue
              const type = isOptional ? scalar : new GraphQLNonNull(scalar)
              return [field.name, { type }]
            })
            .filter(notNullish)
        ),
    })

    return weaverContext.memoNamedType(input)
  }

  public createManyArgs(modelOrName?: string | DMMF.Model): GraphQLObjectType {
    const model = this.getModel(modelOrName)
    const name = `${model.name}CreateManyArgs`
    const existing = weaverContext.getNamedType(name)
    if (existing) return existing as GraphQLObjectType

    const input = new GraphQLObjectType({
      name,
      fields: () => ({
        data: {
          type: new GraphQLNonNull(
            new GraphQLList(new GraphQLNonNull(this.createManyInput()))
          ),
        },
      }),
    })

    return weaverContext.memoNamedType(input)
  }

  public deleteArgs(modelOrName?: string | DMMF.Model): GraphQLObjectType {
    const model = this.getModel(modelOrName)
    const name = `${model.name}DeleteArgs`
    const existing = weaverContext.getNamedType(name)
    if (existing) return existing as GraphQLObjectType

    const input = new GraphQLObjectType({
      name,
      fields: () => ({
        where: {
          type: new GraphQLNonNull(this.whereInput({ model, unique: true })),
        },
      }),
    })

    return weaverContext.memoNamedType(input)
  }

  public deleteManyArgs(modelOrName?: string | DMMF.Model): GraphQLObjectType {
    const model = this.getModel(modelOrName)
    const name = `${model.name}DeleteManyArgs`
    const existing = weaverContext.getNamedType(name)
    if (existing) return existing as GraphQLObjectType

    const input = new GraphQLObjectType({
      name,
      fields: () => ({
        where: {
          type: this.whereInput({ model }),
        },
      }),
    })

    return weaverContext.memoNamedType(input)
  }

  public connectOrCreateInput({
    model: modelName,
    without,
  }: {
    model?: string | DMMF.Model
    without: string
  }): GraphQLObjectType {
    const model = this.getModel(modelName)
    const name = `${model.name}ConnectOrCreateWithout${capitalize(without)}Input`

    const existing = weaverContext.getNamedType(name)
    if (existing) return existing as GraphQLObjectType

    const input = new GraphQLObjectType({
      name,
      fields: () => ({
        where: {
          type: new GraphQLNonNull(this.whereInput({ model, unique: true })),
        },
        create: {
          type: new GraphQLNonNull(this.createInput({ model, without })),
        },
      }),
    })

    return weaverContext.memoNamedType(input)
  }

  public updateToOneWithWhereWInput({
    model: modelName,
    without,
  }: {
    model?: string | DMMF.Model
    without: string
  }): GraphQLObjectType {
    const model = this.getModel(modelName)
    const name = `${model.name}UpdateToOneWithout${capitalize(without)}WithWhereUniqueInput`

    const existing = weaverContext.getNamedType(name)
    if (existing) return existing as GraphQLObjectType

    const input = new GraphQLObjectType({
      name,
      fields: () => ({
        // TODO
      }),
    })

    return weaverContext.memoNamedType(input)
  }

  public updateWithWhereInput({
    model: modelName,
    without,
    many,
    unique,
  }: {
    model?: string | DMMF.Model
    without: string
    many?: boolean
    unique?: boolean
  }): GraphQLObjectType {
    const model = this.getModel(modelName)

    const oneOrMany = many ? "Many" : ""
    const uniqueName = unique ? "Unique" : ""
    const name = `${model.name}UpdateWithWhere${oneOrMany}${uniqueName}Without${capitalize(without)}Input`

    const existing = weaverContext.getNamedType(name)
    if (existing) return existing as GraphQLObjectType

    const input = new GraphQLObjectType({
      name,
      fields: () => ({
        // TODO
      }),
    })
    return weaverContext.memoNamedType(input)
  }

  public upsertInput({
    model: modelName,
    without,
  }: {
    model?: string | DMMF.Model
    without: string
  }): GraphQLObjectType {
    const model = this.getModel(modelName)
    const name = `${model.name}UpsertWithout${capitalize(without)}Input`

    const existing = weaverContext.getNamedType(name)
    if (existing) return existing as GraphQLObjectType

    const input = new GraphQLObjectType({
      name,
      fields: () => ({
        // TODO
      }),
    })
    return weaverContext.memoNamedType(input)
  }

  public updateNestedInput({
    model: modelName,
    without,
    many,
    required,
  }: {
    model?: string | DMMF.Model
    without: string
    many?: boolean
    required?: boolean
  }): GraphQLObjectType {
    const model = this.getModel(modelName)

    const oneOrMany = many ? "Many" : "One"
    const requiredName = required ? "Required" : ""
    const name = `${model.name}Update${oneOrMany}${requiredName}Without${capitalize(without)}NestedInput`

    const existing = weaverContext.getNamedType(name)
    if (existing) return existing as GraphQLObjectType

    const input = new GraphQLObjectType({
      name,
      fields: () => ({
        create: { type: this.createInput({ model, without }) },
        connectOrCreate: {
          type: this.connectOrCreateInput({ model, without }),
        },
        upsert: { type: this.upsertInput({ model, without }) },
        connect: { type: this.whereInput({ model, unique: true }) },
        update: {
          type: this.updateToOneWithWhereWInput({ model, without }),
        },
        ...(required && {
          disconnect: { type: this.whereInput({ model }) },
          delete: { type: this.whereInput({ model }) },
        }),
      }),
    })

    return weaverContext.memoNamedType(input)
  }

  public updateInput(modelOrName?: string | DMMF.Model): GraphQLObjectType {
    const model = this.getModel(modelOrName)
    const name = `${model.name}UpdateInput`
    const existing = weaverContext.getNamedType(name)
    if (existing) return existing as GraphQLObjectType

    const relationFields = new Set<string>()

    const relations = model.fields.filter((f) => f.kind === "object")
    relations.forEach((f) => {
      for (const name of f?.relationFromFields ?? []) relationFields.add(name)
    })

    const input = new GraphQLObjectType({
      name,
      fields: () => ({
        ...Object.fromEntries([
          ...model.fields
            .filter((f) => f.kind === "scalar")
            .map((f) => {
              if (f.isId) return
              if (relationFields.has(f.name)) return null
              const scalar = PrismaWeaver.getGraphQLTypeByField(f)
              if (scalar == null) return
              if (!(scalar instanceof GraphQLScalarType)) return

              return [
                f.name,
                {
                  type: PrismaModelTypeBuilder.fieldUpdateOperationsInput(
                    scalar
                  ),
                },
              ]
            })
            .filter(notNullish),
          ...relations
            .map((field) => {
              const fieldModel = this.getModel(field.type)
              const relationField = fieldModel.fields.find(
                (f) => f.relationName === field.relationName
              )
              if (relationField == null) return
              return [
                field.name,
                {
                  type: this.updateNestedInput({
                    model: fieldModel,
                    without: relationField.name,
                    many: field.isList,
                    required: !field.isList && field.isRequired,
                  }),
                },
              ]
            })
            .filter(notNullish),
        ]),
      }),
    })

    return weaverContext.memoNamedType(input)
  }
}
