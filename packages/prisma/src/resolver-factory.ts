import type { ResolverPayload } from "@gqloom/core"
import {
  EasyDataLoader,
  FieldFactoryWithResolve,
  type FieldOptions,
  type GraphQLFieldOptions,
  type GraphQLSilk,
  getMemoizationMap,
  loom,
  type MayPromise,
  type Middleware,
  MutationFactoryWithResolve,
  type MutationOptions,
  type ObjectChainResolver,
  QueryFactoryWithResolve,
  type QueryOptions,
  type ResolverOptionsWithExtensions,
  type StandardSchemaV1,
  silk,
} from "@gqloom/core"
import type { DMMF } from "@prisma/generator-helper"
import { PrismaWeaver } from "."
import { PrismaActionArgsWeaver } from "./type-weaver"
import type {
  IBatchPayload,
  InferDelegateCountArgs,
  InferDelegateCreateArgs,
  InferDelegateCreateManyArgs,
  InferDelegateDeleteArgs,
  InferDelegateDeleteManyArgs,
  InferDelegateFindFirstArgs,
  InferDelegateFindManyArgs,
  InferDelegateFindUniqueArgs,
  InferDelegateUpdateArgs,
  InferDelegateUpdateManyArgs,
  InferDelegateUpsertArgs,
  InferPrismaDelegate,
  PrismaClient,
  PrismaDelegate,
  PrismaModelMeta,
  PrismaModelSilk,
} from "./types"
import { capitalize, getSelectedFields, gqlType as gt } from "./utils"

export class PrismaResolverFactory<
  TModelSilk extends PrismaModelSilk<any, string, Record<string, any>>,
  TClient extends PrismaClient,
> {
  protected modelData: PrismaModelMeta
  protected typeWeaver: PrismaActionArgsWeaver

  public constructor(
    protected readonly silk: TModelSilk,
    protected readonly client:
      | MayPromise<TClient>
      | ((payload: ResolverPayload | undefined) => MayPromise<TClient>)
  ) {
    this.modelData = silk.meta
    this.typeWeaver = new PrismaActionArgsWeaver(silk)
  }

  protected async getDelegate(
    payload: ResolverPayload | undefined,
    name: string = this.silk.model.name
  ): Promise<InferPrismaDelegate<TClient, TModelSilk["name"]>> {
    if (typeof this.client === "function") {
      return PrismaResolverFactory.getDelegate(
        name,
        await this.client(payload)
      ) as InferPrismaDelegate<TClient, TModelSilk["name"]>
    }
    return PrismaResolverFactory.getDelegate(
      name,
      await this.client
    ) as InferPrismaDelegate<TClient, TModelSilk["name"]>
  }

  public relationField<TKey extends keyof NonNullable<TModelSilk["relations"]>>(
    key: TKey,
    options: {
      middlewares?: Middleware<PrismaResolverRelationField<TModelSilk, TKey>>[]
    } & GraphQLFieldOptions = {}
  ): PrismaResolverRelationField<TModelSilk, TKey> {
    const field = this.silk.model.fields.find((field) => field.name === key)
    if (field == null)
      throw new Error(
        `Field ${String(key)} not found in ${this.silk.model.name}`
      )

    const targetModel = this.modelData.models[field.type]

    let relationFromFields = field.relationFromFields
    let relationToFields = field.relationToFields
    const targetField = this.modelData.models[field.type].fields.find(
      (f) => f.relationName === field.relationName
    )
    if (relationFromFields?.length === 0) {
      if (targetField == null)
        throw new Error(`Field ${String(key)} is not a relation`)
      relationFromFields = targetField.relationToFields
      relationToFields = targetField.relationFromFields
    }
    if (
      field.kind !== "object" ||
      field.relationName == null ||
      relationFromFields == null ||
      relationToFields == null ||
      targetModel == null
    )
      throw new Error(`Field ${String(key)} is not a relation`)
    const getKeyByReference = (item: any) => {
      if (relationToFields.length === 1) {
        return item[relationToFields[0]]
      }
      return relationToFields.map((reference) => item[reference]).join("-")
    }

    const getKeyByField = (parent: any) => {
      if (relationFromFields.length === 1) {
        return parent[relationFromFields[0]]
      }
      return relationFromFields.map((field) => parent[field]).join("-")
    }

    const initLoader = () =>
      new EasyDataLoader(
        async (
          inputs: [parent: any, payload: ResolverPayload | undefined][]
        ) => {
          const length = Math.min(
            relationFromFields.length,
            relationToFields.length
          )
          let where
          if (length === 1) {
            const fieldName = relationToFields[0]
            const values = new Set(
              inputs.map(([parent]) => parent[relationFromFields[0]])
            )
            if (targetField?.isRequired) {
              values.delete(null)
            }
            if (values.size === 0) {
              return inputs.map(() => (field.isList ? [] : null))
            }
            where = { [fieldName]: { in: [...values] } }
          } else {
            const OR: any[] = []
            for (const [parent] of inputs) {
              const item = {} as any
              for (let i = 0; i < length; i++) {
                item[relationToFields[i]] = parent[relationFromFields[i]]
              }
              OR.push(item)
            }
            where = { OR }
          }

          const select = getSelectedFields(
            targetModel,
            inputs.map((input) => input[1])
          )

          const relationTo = Object.fromEntries(
            relationToFields.map((f) => [f, true])
          )
          const delegate = await this.getDelegate(
            inputs[0]?.[1],
            targetModel.name
          )
          const list = await (delegate as any).findMany({
            select: { ...select, ...relationTo },
            where,
          })

          const groups = new Map<string, any>()
          for (const item of list) {
            const key = getKeyByReference(item)
            field.isList
              ? groups.set(key, [...(groups.get(key) ?? []), item])
              : groups.set(key, item)
          }
          return inputs.map(([parent]) => {
            const key = getKeyByField(parent)
            return groups.get(key) ?? (field.isList ? [] : null)
          })
        }
      )

    const output = this.relationFieldOutput(field)
    return new FieldFactoryWithResolve(output, {
      ...options,
      dependencies: relationFromFields,
      resolve: async (parent, _input, payload) => {
        const loader = (() => {
          if (!payload) return initLoader()
          const memoMap = getMemoizationMap(payload)
          if (!memoMap.has(initLoader)) memoMap.set(initLoader, initLoader())
          return memoMap.get(initLoader) as ReturnType<typeof initLoader>
        })()
        return loader.load([parent, payload])
      },
    } as FieldOptions<any, any, any, any>)
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
  protected uniqueWhere(
    instance: Omit<
      StandardSchemaV1.InferOutput<NonNullable<TModelSilk>>,
      `__selective_${string}_brand__`
    >
  ): any {
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

  public resolver(
    options?: ResolverOptionsWithExtensions
  ): ObjectChainResolver<TModelSilk, PrismaResolver<TModelSilk, TClient>> {
    const name = capitalize(this.silk.name)
    return loom.resolver.of(
      this.silk,
      {
        [`count${name}`]: this.countQuery(),
        [`findFirst${name}`]: this.findFirstQuery(),
        [`findMany${name}`]: this.findManyQuery(),
        [`findUnique${name}`]: this.findUniqueQuery(),
        [`create${name}`]: this.createMutation(),
        [`createMany${name}`]: this.createManyMutation(),
        [`delete${name}`]: this.deleteMutation(),
        [`deleteMany${name}`]: this.deleteManyMutation(),
        [`update${name}`]: this.updateMutation(),
        [`updateMany${name}`]: this.updateManyMutation(),
        [`upsert${name}`]: this.upsertMutation(),
        ...Object.fromEntries(
          this.silk.model.fields
            .filter((it) => it.kind === "object")
            .map((field) => [field.name, this.relationField(field.name)])
        ),
      },
      options as ResolverOptionsWithExtensions<any>
    ) as any
  }

  public queriesResolver(
    options?: ResolverOptionsWithExtensions
  ): ObjectChainResolver<
    TModelSilk,
    PrismaQueriesResolver<TModelSilk, TClient>
  > {
    const name = capitalize(this.silk.name)
    return loom.resolver.of(
      this.silk,
      {
        [`count${name}`]: this.countQuery(),
        [`findFirst${name}`]: this.findFirstQuery(),
        [`findMany${name}`]: this.findManyQuery(),
        [`findUnique${name}`]: this.findUniqueQuery(),
        ...Object.fromEntries(
          this.silk.model.fields
            .filter((it) => it.kind === "object")
            .map((field) => [field.name, this.relationField(field.name)])
        ),
      },
      options as ResolverOptionsWithExtensions<any>
    ) as any
  }

  public countQuery<
    TInputI = InferDelegateCountArgs<
      InferPrismaDelegate<TClient, TModelSilk["name"]>
    >,
  >({
    input,
    ...options
  }: GraphQLFieldOptions & {
    input?: GraphQLSilk<
      InferDelegateCountArgs<InferPrismaDelegate<TClient, TModelSilk["name"]>>,
      TInputI
    >
    middlewares?: Middleware<
      PrismaResolverCountQuery<TModelSilk, TClient, TInputI>
    >[]
  } = {}): PrismaResolverCountQuery<TModelSilk, TClient, TInputI> {
    input ??= silk(() => this.typeWeaver.countArgs()) as GraphQLSilk<
      InferDelegateCountArgs<InferPrismaDelegate<TClient, TModelSilk["name"]>>,
      TInputI
    >

    return new QueryFactoryWithResolve(
      silk<number>(() => gt.nonNull(gt.int)),
      {
        ...options,
        input,
        resolve: async (input, payload) =>
          (await this.getDelegate(payload)).count(input),
      } as QueryOptions<any, any>
    )
  }

  public findFirstQuery<
    TInputI = InferDelegateFindFirstArgs<
      InferPrismaDelegate<TClient, TModelSilk["name"]>
    >,
  >({
    input,
    ...options
  }: GraphQLFieldOptions & {
    input?: GraphQLSilk<
      InferDelegateFindFirstArgs<
        InferPrismaDelegate<TClient, TModelSilk["name"]>
      >,
      TInputI
    >
    middlewares?: Middleware<
      PrismaResolverFindFirstQuery<TModelSilk, TClient, TInputI>
    >[]
  } = {}): PrismaResolverFindFirstQuery<TModelSilk, TClient, TInputI> {
    input ??= silk(() => this.typeWeaver.findFirstArgs())

    const output = PrismaWeaver.unravel(this.silk.model, this.modelData)

    return new QueryFactoryWithResolve(output.nullable(), {
      ...options,
      input,
      resolve: async (input, payload) =>
        (await this.getDelegate(payload)).findFirst({
          select: getSelectedFields(this.silk, payload),
          ...input,
        }),
    } as QueryOptions<any, any>)
  }

  public findManyQuery<
    TInputI = InferDelegateFindManyArgs<
      InferPrismaDelegate<TClient, TModelSilk["name"]>
    >,
  >({
    input,
    ...options
  }: GraphQLFieldOptions & {
    input?: GraphQLSilk<
      InferDelegateFindManyArgs<
        InferPrismaDelegate<TClient, TModelSilk["name"]>
      >,
      TInputI
    >
    middlewares?: Middleware<
      PrismaResolverFindManyQuery<TModelSilk, TClient, TInputI>
    >[]
  } = {}): PrismaResolverFindManyQuery<TModelSilk, TClient, TInputI> {
    input ??= silk(() => this.typeWeaver.findManyArgs())

    const output = PrismaWeaver.unravel(this.silk.model, this.modelData)

    return new QueryFactoryWithResolve(output.list(), {
      ...options,
      input,
      resolve: async (input, payload) =>
        (await this.getDelegate(payload)).findMany({
          select: getSelectedFields(this.silk, payload),
          ...input,
        }),
    } as QueryOptions<any, any>)
  }

  public findUniqueQuery<
    TInputI = InferDelegateFindUniqueArgs<
      InferPrismaDelegate<TClient, TModelSilk["name"]>
    >,
  >({
    input,
    ...options
  }: GraphQLFieldOptions & {
    input?: GraphQLSilk<
      InferDelegateFindUniqueArgs<
        InferPrismaDelegate<TClient, TModelSilk["name"]>
      >,
      TInputI
    >
    middlewares?: Middleware<
      PrismaResolverFindUniqueQuery<TModelSilk, TClient, TInputI>
    >[]
  } = {}): PrismaResolverFindUniqueQuery<TModelSilk, TClient, TInputI> {
    input ??= silk(() => this.typeWeaver.findUniqueArgs())

    const output = PrismaWeaver.unravel(this.silk.model, this.modelData)

    return new QueryFactoryWithResolve(output.nullable(), {
      ...options,
      input,
      resolve: async (input, payload) =>
        (await this.getDelegate(payload)).findUnique({
          select: getSelectedFields(this.silk, payload),
          ...input,
        }),
    } as QueryOptions<any, any>)
  }

  public createMutation<
    TInputI = InferDelegateCreateArgs<
      InferPrismaDelegate<TClient, TModelSilk["name"]>
    >,
  >({
    input,
    ...options
  }: GraphQLFieldOptions & {
    input?: GraphQLSilk<
      InferDelegateCreateArgs<InferPrismaDelegate<TClient, TModelSilk["name"]>>,
      TInputI
    >
    middlewares?: Middleware<
      PrismaResolverCreateMutation<TModelSilk, TClient, TInputI>
    >[]
  } = {}): PrismaResolverCreateMutation<TModelSilk, TClient, TInputI> {
    input ??= silk(() => gt.nonNull(this.typeWeaver.createArgs()))

    const output = PrismaWeaver.unravel(this.silk.model, this.modelData)

    return new MutationFactoryWithResolve(output.nullable(), {
      ...options,
      input,
      resolve: async (input, payload) =>
        (await this.getDelegate(payload)).create({
          select: getSelectedFields(this.silk, payload),
          ...input,
        }),
    } as MutationOptions<any, any>)
  }

  public createManyMutation<
    TInputI = InferDelegateCreateManyArgs<
      InferPrismaDelegate<TClient, TModelSilk["name"]>
    >,
  >({
    input,
    ...options
  }: GraphQLFieldOptions & {
    input?: GraphQLSilk<
      InferDelegateCreateManyArgs<
        InferPrismaDelegate<TClient, TModelSilk["name"]>
      >,
      TInputI
    >
    middlewares?: Middleware<
      PrismaResolverCreateManyMutation<TModelSilk, TClient, TInputI>
    >[]
  } = {}): PrismaResolverCreateManyMutation<TModelSilk, TClient, TInputI> {
    input ??= silk(() => gt.nonNull(this.typeWeaver.createManyArgs()))

    const output = PrismaResolverFactory.batchPayloadSilk()

    return new MutationFactoryWithResolve(output, {
      ...options,
      input,
      resolve: async (input, payload) =>
        (await this.getDelegate(payload)).createMany(input),
    } as MutationOptions<any, any>)
  }

  public deleteMutation<
    TInputI = InferDelegateDeleteArgs<
      InferPrismaDelegate<TClient, TModelSilk["name"]>
    >,
  >({
    input,
    ...options
  }: GraphQLFieldOptions & {
    input?: GraphQLSilk<
      InferDelegateDeleteArgs<InferPrismaDelegate<TClient, TModelSilk["name"]>>,
      TInputI
    >
    middlewares?: Middleware<
      PrismaResolverDeleteMutation<TModelSilk, TClient, TInputI>
    >[]
  } = {}): PrismaResolverDeleteMutation<TModelSilk, TClient, TInputI> {
    input ??= silk(() => gt.nonNull(this.typeWeaver.deleteArgs()))

    const output = PrismaWeaver.unravel(this.silk.model, this.modelData)

    return new MutationFactoryWithResolve(output.nullable(), {
      ...options,
      input,
      resolve: async (input, payload) => {
        // we should return null if the row is not found
        // https://github.com/prisma/prisma/issues/4072
        try {
          return await (await this.getDelegate(payload)).delete({
            select: getSelectedFields(this.silk, payload),
            ...input,
          })
        } catch (_err) {
          return null
        }
      },
    } as MutationOptions<any, any>)
  }

  public deleteManyMutation<
    TInputI = InferDelegateDeleteManyArgs<
      InferPrismaDelegate<TClient, TModelSilk["name"]>
    >,
  >({
    input,
    ...options
  }: GraphQLFieldOptions & {
    input?: GraphQLSilk<
      InferDelegateDeleteManyArgs<
        InferPrismaDelegate<TClient, TModelSilk["name"]>
      >,
      TInputI
    >
    middlewares?: Middleware<
      PrismaResolverDeleteManyMutation<TModelSilk, TClient, TInputI>
    >[]
  } = {}): PrismaResolverDeleteManyMutation<TModelSilk, TClient, TInputI> {
    input ??= silk(() => gt.nonNull(this.typeWeaver.deleteManyArgs()))
    const output = PrismaResolverFactory.batchPayloadSilk()
    return new MutationFactoryWithResolve(output, {
      ...options,
      input,
      resolve: async (input, payload) => {
        return (await this.getDelegate(payload)).deleteMany(input)
      },
    } as MutationOptions<any, any>)
  }

  public updateMutation<
    TInputI = InferDelegateUpdateArgs<
      InferPrismaDelegate<TClient, TModelSilk["name"]>
    >,
  >({
    input,
    ...options
  }: GraphQLFieldOptions & {
    input?: GraphQLSilk<
      InferDelegateUpdateArgs<InferPrismaDelegate<TClient, TModelSilk["name"]>>,
      TInputI
    >
    middlewares?: Middleware<
      PrismaResolverUpdateMutation<TModelSilk, TClient, TInputI>
    >[]
  } = {}): PrismaResolverUpdateMutation<TModelSilk, TClient, TInputI> {
    input ??= silk(() => gt.nonNull(this.typeWeaver.updateArgs()))
    const output = PrismaWeaver.unravel(this.silk.model, this.modelData)
    return new MutationFactoryWithResolve(output, {
      ...options,
      input,
      resolve: async (input, payload) =>
        (await this.getDelegate(payload)).update({
          select: getSelectedFields(this.silk, payload),
          ...input,
        }),
    } as MutationOptions<any, any>)
  }

  public updateManyMutation<
    TInputI = InferDelegateUpdateManyArgs<
      InferPrismaDelegate<TClient, TModelSilk["name"]>
    >,
  >({
    input,
    ...options
  }: GraphQLFieldOptions & {
    input?: GraphQLSilk<
      InferDelegateUpdateManyArgs<
        InferPrismaDelegate<TClient, TModelSilk["name"]>
      >,
      TInputI
    >
    middlewares?: Middleware<
      PrismaResolverUpdateManyMutation<TModelSilk, TClient, TInputI>
    >[]
  } = {}): PrismaResolverUpdateManyMutation<TModelSilk, TClient, TInputI> {
    input ??= silk(() => gt.nonNull(this.typeWeaver.updateManyArgs()))
    const output = PrismaResolverFactory.batchPayloadSilk()

    return new MutationFactoryWithResolve(output, {
      ...options,
      input,
      resolve: async (input, payload) =>
        (await this.getDelegate(payload)).updateMany(input),
    } as MutationOptions<any, any>)
  }

  public upsertMutation<
    TInputI = InferDelegateUpsertArgs<
      InferPrismaDelegate<TClient, TModelSilk["name"]>
    >,
  >({
    input,
    ...options
  }: GraphQLFieldOptions & {
    input?: GraphQLSilk<
      InferDelegateUpsertArgs<InferPrismaDelegate<TClient, TModelSilk["name"]>>,
      TInputI
    >
    middlewares?: Middleware<
      PrismaResolverUpsertMutation<TModelSilk, TClient, TInputI>
    >[]
  } = {}): PrismaResolverUpsertMutation<TModelSilk, TClient, TInputI> {
    input ??= silk(() => gt.nonNull(this.typeWeaver.upsertArgs()))
    const output = PrismaWeaver.unravel(this.silk.model, this.modelData)
    return new MutationFactoryWithResolve(output, {
      ...options,
      input,
      resolve: async (input, payload) =>
        (await this.getDelegate(payload)).upsert(input),
    } as MutationOptions<any, any>)
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

  public static batchPayloadSilk(): GraphQLSilk<IBatchPayload, IBatchPayload> {
    return silk(() => PrismaActionArgsWeaver.batchPayload()) as GraphQLSilk<
      IBatchPayload,
      IBatchPayload
    >
  }
}

export interface PrismaResolverRelationField<
  TModelSilk extends PrismaModelSilk<any, string, Record<string, any>>,
  TKey extends keyof NonNullable<TModelSilk["relations"]>,
> extends FieldFactoryWithResolve<
    TModelSilk,
    GraphQLSilk<
      NonNullable<TModelSilk["relations"]>[TKey] extends Array<infer T>
        ? Partial<T>[]
        : Partial<NonNullable<TModelSilk["relations"]>[TKey]>
    >
  > {}

export interface PrismaResolverCountQuery<
  TModelSilk extends PrismaModelSilk<any, string, Record<string, any>>,
  TClient extends PrismaClient,
  TInputI = InferDelegateCountArgs<
    InferPrismaDelegate<TClient, TModelSilk["name"]>
  >,
> extends QueryFactoryWithResolve<
    InferDelegateCountArgs<InferPrismaDelegate<TClient, TModelSilk["name"]>>,
    GraphQLSilk<number>,
    GraphQLSilk<
      InferDelegateCountArgs<InferPrismaDelegate<TClient, TModelSilk["name"]>>,
      TInputI
    >
  > {}

export interface PrismaResolverFindFirstQuery<
  TModelSilk extends PrismaModelSilk<any, string, Record<string, any>>,
  TClient extends PrismaClient,
  TInputI = InferDelegateFindFirstArgs<
    InferPrismaDelegate<TClient, TModelSilk["name"]>
  >,
> extends QueryFactoryWithResolve<
    InferDelegateFindFirstArgs<
      InferPrismaDelegate<TClient, TModelSilk["name"]>
    >,
    ReturnType<TModelSilk["nullable"]>,
    GraphQLSilk<
      InferDelegateFindFirstArgs<
        InferPrismaDelegate<TClient, TModelSilk["name"]>
      >,
      TInputI
    >
  > {}

export interface PrismaResolverFindManyQuery<
  TModelSilk extends PrismaModelSilk<any, string, Record<string, any>>,
  TClient extends PrismaClient,
  TInputI = InferDelegateFindManyArgs<
    InferPrismaDelegate<TClient, TModelSilk["name"]>
  >,
> extends QueryFactoryWithResolve<
    InferDelegateFindManyArgs<InferPrismaDelegate<TClient, TModelSilk["name"]>>,
    ReturnType<TModelSilk["list"]>,
    GraphQLSilk<
      InferDelegateFindManyArgs<
        InferPrismaDelegate<TClient, TModelSilk["name"]>
      >,
      TInputI
    >
  > {}

export interface PrismaResolverFindUniqueQuery<
  TModelSilk extends PrismaModelSilk<any, string, Record<string, any>>,
  TClient extends PrismaClient,
  TInputI = InferDelegateFindUniqueArgs<
    InferPrismaDelegate<TClient, TModelSilk["name"]>
  >,
> extends QueryFactoryWithResolve<
    InferDelegateFindUniqueArgs<
      InferPrismaDelegate<TClient, TModelSilk["name"]>
    >,
    ReturnType<TModelSilk["nullable"]>,
    GraphQLSilk<
      InferDelegateFindUniqueArgs<
        InferPrismaDelegate<TClient, TModelSilk["name"]>
      >,
      TInputI
    >
  > {}

export interface PrismaResolverCreateMutation<
  TModelSilk extends PrismaModelSilk<any, string, Record<string, any>>,
  TClient extends PrismaClient,
  TInputI = InferDelegateCreateArgs<
    InferPrismaDelegate<TClient, TModelSilk["name"]>
  >,
> extends MutationFactoryWithResolve<
    InferDelegateCreateArgs<InferPrismaDelegate<TClient, TModelSilk["name"]>>,
    TModelSilk,
    GraphQLSilk<
      InferDelegateCreateArgs<InferPrismaDelegate<TClient, TModelSilk["name"]>>,
      TInputI
    >
  > {}

export interface PrismaResolverCreateManyMutation<
  TModelSilk extends PrismaModelSilk<any, string, Record<string, any>>,
  TClient extends PrismaClient,
  TInputI = InferDelegateCreateManyArgs<
    InferPrismaDelegate<TClient, TModelSilk["name"]>
  >,
> extends MutationFactoryWithResolve<
    InferDelegateCreateManyArgs<
      InferPrismaDelegate<TClient, TModelSilk["name"]>
    >,
    GraphQLSilk<IBatchPayload, IBatchPayload>,
    GraphQLSilk<
      InferDelegateCreateManyArgs<
        InferPrismaDelegate<TClient, TModelSilk["name"]>
      >,
      TInputI
    >
  > {}
export interface PrismaResolverDeleteMutation<
  TModelSilk extends PrismaModelSilk<any, string, Record<string, any>>,
  TClient extends PrismaClient,
  TInputI = InferDelegateDeleteArgs<
    InferPrismaDelegate<TClient, TModelSilk["name"]>
  >,
> extends MutationFactoryWithResolve<
    InferDelegateDeleteArgs<InferPrismaDelegate<TClient, TModelSilk["name"]>>,
    ReturnType<TModelSilk["nullable"]>,
    GraphQLSilk<
      InferDelegateDeleteArgs<InferPrismaDelegate<TClient, TModelSilk["name"]>>,
      TInputI
    >
  > {}

export interface PrismaResolverDeleteManyMutation<
  TModelSilk extends PrismaModelSilk<any, string, Record<string, any>>,
  TClient extends PrismaClient,
  TInputI = InferDelegateDeleteManyArgs<
    InferPrismaDelegate<TClient, TModelSilk["name"]>
  >,
> extends MutationFactoryWithResolve<
    InferDelegateDeleteManyArgs<
      InferPrismaDelegate<TClient, TModelSilk["name"]>
    >,
    GraphQLSilk<IBatchPayload, IBatchPayload>,
    GraphQLSilk<
      InferDelegateDeleteManyArgs<
        InferPrismaDelegate<TClient, TModelSilk["name"]>
      >,
      TInputI
    >
  > {}

export interface PrismaResolverUpdateMutation<
  TModelSilk extends PrismaModelSilk<any, string, Record<string, any>>,
  TClient extends PrismaClient,
  TInputI = InferDelegateUpdateArgs<
    InferPrismaDelegate<TClient, TModelSilk["name"]>
  >,
> extends MutationFactoryWithResolve<
    InferDelegateUpdateArgs<InferPrismaDelegate<TClient, TModelSilk["name"]>>,
    TModelSilk,
    GraphQLSilk<
      InferDelegateUpdateArgs<InferPrismaDelegate<TClient, TModelSilk["name"]>>,
      TInputI
    >
  > {}

export interface PrismaResolverUpdateManyMutation<
  TModelSilk extends PrismaModelSilk<any, string, Record<string, any>>,
  TClient extends PrismaClient,
  TInputI = InferDelegateUpdateManyArgs<
    InferPrismaDelegate<TClient, TModelSilk["name"]>
  >,
> extends MutationFactoryWithResolve<
    InferDelegateUpdateManyArgs<
      InferPrismaDelegate<TClient, TModelSilk["name"]>
    >,
    GraphQLSilk<IBatchPayload, IBatchPayload>,
    GraphQLSilk<
      InferDelegateUpdateManyArgs<
        InferPrismaDelegate<TClient, TModelSilk["name"]>
      >,
      TInputI
    >
  > {}

export interface PrismaResolverUpsertMutation<
  TModelSilk extends PrismaModelSilk<any, string, Record<string, any>>,
  TClient extends PrismaClient,
  TInputI = InferDelegateUpsertArgs<
    InferPrismaDelegate<TClient, TModelSilk["name"]>
  >,
> extends MutationFactoryWithResolve<
    InferDelegateUpsertArgs<InferPrismaDelegate<TClient, TModelSilk["name"]>>,
    GraphQLSilk<IBatchPayload, IBatchPayload>,
    GraphQLSilk<
      InferDelegateUpsertArgs<InferPrismaDelegate<TClient, TModelSilk["name"]>>,
      TInputI
    >
  > {}

export type PrismaQueriesResolver<
  TModelSilk extends PrismaModelSilk<any, string, Record<string, any>>,
  TClient extends PrismaClient,
> = {
  [TKey in keyof NonNullable<
    TModelSilk["relations"]
  >]-?: PrismaResolverRelationField<TModelSilk, TKey>
} & {
  [key in `count${Capitalize<TModelSilk["name"]>}`]: PrismaResolverCountQuery<
    TModelSilk,
    TClient
  >
} & {
  [key in `findFirst${Capitalize<TModelSilk["name"]>}`]: PrismaResolverFindFirstQuery<
    TModelSilk,
    TClient
  >
} & {
  [key in `findMany${Capitalize<TModelSilk["name"]>}`]: PrismaResolverFindManyQuery<
    TModelSilk,
    TClient
  >
} & {
  [key in `findUnique${Capitalize<TModelSilk["name"]>}`]: PrismaResolverFindUniqueQuery<
    TModelSilk,
    TClient
  >
}

export type PrismaResolver<
  TModelSilk extends PrismaModelSilk<any, string, Record<string, any>>,
  TClient extends PrismaClient,
> = PrismaQueriesResolver<TModelSilk, TClient> & {
  [key in `create${Capitalize<TModelSilk["name"]>}`]: PrismaResolverCreateMutation<
    TModelSilk,
    TClient
  >
} & {
  [key in `createMany${Capitalize<TModelSilk["name"]>}`]: PrismaResolverCreateManyMutation<
    TModelSilk,
    TClient
  >
} & {
  [key in `delete${Capitalize<TModelSilk["name"]>}`]: PrismaResolverDeleteMutation<
    TModelSilk,
    TClient
  >
} & {
  [key in `deleteMany${Capitalize<TModelSilk["name"]>}`]: PrismaResolverDeleteManyMutation<
    TModelSilk,
    TClient
  >
} & {
  [key in `update${Capitalize<TModelSilk["name"]>}`]: PrismaResolverUpdateMutation<
    TModelSilk,
    TClient
  >
} & {
  [key in `updateMany${Capitalize<TModelSilk["name"]>}`]: PrismaResolverUpdateManyMutation<
    TModelSilk,
    TClient
  >
} & {
  [key in `upsert${Capitalize<TModelSilk["name"]>}`]: PrismaResolverUpsertMutation<
    TModelSilk,
    TClient
  >
}
