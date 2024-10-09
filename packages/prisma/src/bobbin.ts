import { type DMMF } from "@prisma/generator-helper"
import { PrismaWeaver } from "."
import {
  type PrismaDataModel,
  type PrismaClient,
  type PrismaModelSilk,
  type PrismaDelegate,
} from "./types"
import {
  type InferSilkO,
  type FieldOrOperation,
  type GraphQLSilk,
  weaverContext,
  notNullish,
} from "@gqloom/core"
import {
  GraphQLEnumType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLString,
} from "graphql"

export class PrismaModelTypeBuilder<
  TModalSilk extends PrismaModelSilk<any, any>,
> {
  protected modelData: PrismaDataModel
  constructor(protected readonly silk: TModalSilk) {
    this.modelData = silk.data
  }

  getModel(modelOrName?: string | DMMF.Model): DMMF.Model {
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

              if (unique && f.isId) return [f.name, { type: scalar }]
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
}

export class PrismaModelBobbin<TModalSilk extends PrismaModelSilk<any, any>> {
  protected modelData: PrismaDataModel
  protected delegate: PrismaDelegate
  protected typeBobbin: PrismaModelTypeBuilder<TModalSilk>
  constructor(
    protected readonly silk: TModalSilk,
    protected readonly client: PrismaClient
  ) {
    this.modelData = silk.data
    this.delegate = PrismaModelBobbin.getDelegate(silk.model.name, client)
    this.typeBobbin = new PrismaModelTypeBuilder(silk)
  }

  public relationField<TKey extends keyof NonNullable<TModalSilk["relations"]>>(
    key: TKey
  ): FieldOrOperation<
    TModalSilk,
    GraphQLSilk<NonNullable<TModalSilk["relations"]>[TKey]>,
    undefined,
    "field"
  > {
    const field = this.silk.model.fields.find((field) => field.name === key)
    if (field == null)
      throw new Error(
        `Field ${String(key)} not found in ${this.silk.model.name}`
      )

    if (field.kind !== "object" || field.relationName == null)
      throw new Error(`Field ${String(key)} is not a relation`)

    return {
      type: "field",
      input: undefined,
      output: this.relationFieldOutput(field) as any,
      resolve: (parent) => {
        const promise = this.delegate.findUnique({
          where: this.uniqueWhere(parent),
        })
        if (key in promise && typeof promise[key] === "function")
          return promise[key]()

        return null
      },
    }
  }

  protected relationFieldOutput(field: DMMF.Field): GraphQLSilk<any> {
    const outputModel = this.modelData.models[field.type]
    if (outputModel == null) throw new Error(`Model ${field.type} not found`)
    const output = PrismaWeaver.unravel(outputModel, this.modelData)
    if (field.isList) return output.list()
    if (field.isRequired === false) return output.nullable()
    return output
  }

  protected idKey?: string
  protected uniqueWhere(instance: InferSilkO<NonNullable<TModalSilk>>): any {
    if (this.silk.model.primaryKey == null) {
      this.idKey ??= (() => {
        const idField = this.silk.model.fields.find((field) => field.isId)
        if (idField == null) throw new Error("No id field found")
        return idField.name
      })()
      return { [this.idKey]: instance[this.idKey] }
    }

    const primaryKeyName =
      this.silk.model.primaryKey.name ??
      this.silk.model.primaryKey.fields.join("_")

    const primaryCondition = Object.create(null)
    for (const field of this.silk.model.primaryKey.fields) {
      primaryCondition[field] = instance[field]
    }
    return { [primaryKeyName]: primaryCondition }
  }

  protected countQuery() {
    // TODO
  }

  protected findFirstQuery() {
    // TODO
  }

  protected findManyQuery() {
    // TODO
  }

  protected findUniqueQuery() {
    // TODO
  }

  protected createMutation() {
    // TODO
  }

  protected createManyMutation() {
    // TODO
  }

  protected deleteMutation() {
    // TODO
  }

  protected deleteManyMutation() {
    // TODO
  }

  protected updateMutation() {
    // TODO
  }

  protected updateManyMutation() {
    // TODO
  }

  protected upsertMutation() {
    // TODO
  }

  protected static getDelegate(
    modelName: string,
    client: PrismaClient
  ): PrismaDelegate {
    const lowerCase = `${modelName.slice(0, 1).toLowerCase()}${modelName.slice(1)}`

    const delegate =
      lowerCase in client
        ? (client as PrismaClient & Record<string, unknown>)[lowerCase]
        : null

    if (!delegate) {
      throw new Error(`Unable to find delegate for model ${modelName}`)
    }

    return delegate as PrismaDelegate
  }
}
