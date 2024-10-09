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
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLString,
} from "graphql"

export class PrismaModelTypeBuilder<
  TModalSilk extends PrismaModelSilk<any, any>,
> {
  constructor(protected readonly silk: TModalSilk) {}

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

  public whereInput(): GraphQLObjectType {
    const name = `${this.silk.model.name}WhereInput`

    const existing = weaverContext.getNamedType(name)
    if (existing) return existing as GraphQLObjectType
    const input: GraphQLObjectType = new GraphQLObjectType({
      name,
      fields: () => ({
        AND: { type: new GraphQLList(new GraphQLNonNull(input)) },
        OR: { type: new GraphQLList(new GraphQLNonNull(input)) },
        NOT: { type: new GraphQLList(new GraphQLNonNull(input)) },
        ...Object.fromEntries(
          this.silk.model.fields
            .filter((f) => f.kind === "scalar")
            .map((f) => {
              const scalar = PrismaWeaver.getGraphQLTypeByField(f)
              if (scalar == null) return
              if (!(scalar instanceof GraphQLScalarType)) return
              return [
                f.name,
                { type: PrismaModelTypeBuilder.scalarFilter(scalar) },
              ]
            })
            .filter(notNullish)
        ),
      }),
    })
    return weaverContext.memoNamedType(input)
  }

  public primaryKeyInput(): GraphQLObjectType | null {
    if (this.silk.model.primaryKey == null) return null
    let primaryKeyName =
      this.silk.model.primaryKey.name ??
      this.silk.model.primaryKey.fields.join("_")

    primaryKeyName =
      primaryKeyName.slice(0, 1).toUpperCase() + primaryKeyName.slice(1)

    const name = `${this.silk.model.name}${primaryKeyName}Input`

    const existing = weaverContext.getNamedType(name)
    if (existing) return existing as GraphQLObjectType

    const primaryKey = this.silk.model.primaryKey
    const input: GraphQLObjectType = new GraphQLObjectType({
      name,
      fields: () => ({
        ...Object.fromEntries(
          primaryKey.fields
            .map((name) => {
              const f = this.silk.model.fields.find((f) => f.name === name)
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

  public whereUniqueInput(): GraphQLObjectType {
    const name = `${this.silk.model.name}WhereUniqueInput`

    const existing = weaverContext.getNamedType(name)
    if (existing) return existing as GraphQLObjectType
    const input: GraphQLObjectType = new GraphQLObjectType({
      name,
      fields: () => ({
        AND: { type: new GraphQLList(new GraphQLNonNull(this.whereInput())) },
        OR: { type: new GraphQLList(new GraphQLNonNull(this.whereInput())) },
        NOT: { type: new GraphQLList(new GraphQLNonNull(this.whereInput())) },
        ...Object.fromEntries(
          this.silk.model.fields
            .filter((f) => f.kind === "scalar")
            .map((f) => {
              const scalar = PrismaWeaver.getGraphQLTypeByField(f)
              if (scalar == null) return
              if (!(scalar instanceof GraphQLScalarType)) return

              if (f.isId) return [f.name, { type: scalar }]
              return [
                f.name,
                { type: PrismaModelTypeBuilder.scalarFilter(scalar) },
              ]
            })
            .filter(notNullish)
        ),
        ...(this.silk.model.primaryKey && {
          [this.silk.model.primaryKey.name ??
          this.silk.model.primaryKey.fields.join("_")]: {
            type: this.primaryKeyInput(),
          },
        }),
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
