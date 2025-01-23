import {
  type FieldOrOperation,
  type GraphQLFieldOptions,
  type GraphQLSilk,
  type Middleware,
  type ResolverOptionsWithExtensions,
  type StandardSchemaV1,
  loom,
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
import { capitalize, gqlType as gt } from "./utils"

export class PrismaModelBobbin<
  TModelSilk extends PrismaModelSilk<any, string, Record<string, any>>,
  TClient extends PrismaClient,
> {
  protected modelData: PrismaModelMeta
  protected delegate: InferPrismaDelegate<TClient, TModelSilk["name"]>
  protected typeWeaver: PrismaActionArgsWeaver

  constructor(
    protected readonly silk: TModelSilk,
    protected readonly client: TClient
  ) {
    this.modelData = silk.meta
    this.delegate = PrismaModelBobbin.getDelegate(
      silk.model.name,
      client
    ) as InferPrismaDelegate<TClient, TModelSilk["name"]>
    this.typeWeaver = new PrismaActionArgsWeaver(silk)
  }

  public relationField<TKey extends keyof NonNullable<TModelSilk["relations"]>>(
    key: TKey,
    options: {
      middlewares?: Middleware<BobbinRelationField<TModelSilk, TKey>>[]
    } & GraphQLFieldOptions = {}
  ): BobbinRelationField<TModelSilk, TKey> {
    const field = this.silk.model.fields.find((field) => field.name === key)
    if (field == null)
      throw new Error(
        `Field ${String(key)} not found in ${this.silk.model.name}`
      )

    if (field.kind !== "object" || field.relationName == null)
      throw new Error(`Field ${String(key)} is not a relation`)

    return loom.field(this.relationFieldOutput(field), {
      ...options,
      resolve: (parent) => {
        const promise = this.delegate.findUnique({
          where: this.uniqueWhere(parent),
        })
        if (key in promise && typeof promise[key] === "function")
          return promise[key]()
        return null
      },
    })
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
    instance: StandardSchemaV1.InferOutput<NonNullable<TModelSilk>>
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
  ): BobbinResolver<TModelSilk, TClient> {
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
      options
    ) as BobbinResolver<TModelSilk, TClient>
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
    middlewares?: Middleware<BobbinCountQuery<TModelSilk, TClient, TInputI>>[]
  } = {}): BobbinCountQuery<TModelSilk, TClient, TInputI> {
    input ??= silk(() => this.typeWeaver.countArgs()) as GraphQLSilk<
      InferDelegateCountArgs<InferPrismaDelegate<TClient, TModelSilk["name"]>>,
      TInputI
    >

    return loom.query(
      silk<number>(() => gt.nonNull(gt.int)),
      {
        ...options,
        input,
        resolve: (input) => this.delegate.count(input),
      }
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
      BobbinFindFirstQuery<TModelSilk, TClient, TInputI>
    >[]
  } = {}): BobbinFindFirstQuery<TModelSilk, TClient, TInputI> {
    input ??= silk(() => this.typeWeaver.findFirstArgs())

    const output = PrismaWeaver.unravel(this.silk.model, this.modelData)

    return loom.query(output.nullable(), {
      ...options,
      input,
      resolve: (input) => this.delegate.findFirst(input),
    }) as BobbinFindFirstQuery<TModelSilk, TClient, TInputI>
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
      BobbinFindManyQuery<TModelSilk, TClient, TInputI>
    >[]
  } = {}): BobbinFindManyQuery<TModelSilk, TClient, TInputI> {
    input ??= silk(() => this.typeWeaver.findManyArgs())

    const output = PrismaWeaver.unravel(this.silk.model, this.modelData)

    return loom.query(output.list(), {
      ...options,
      input,
      resolve: (input) => this.delegate.findMany(input),
    }) as BobbinFindManyQuery<TModelSilk, TClient, TInputI>
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
      BobbinFindUniqueQuery<TModelSilk, TClient, TInputI>
    >[]
  } = {}): BobbinFindUniqueQuery<TModelSilk, TClient, TInputI> {
    input ??= silk(() => this.typeWeaver.findUniqueArgs())

    const output = PrismaWeaver.unravel(this.silk.model, this.modelData)

    return loom.query(output.nullable(), {
      ...options,
      input,
      resolve: (input) => this.delegate.findUnique(input),
    }) as BobbinFindUniqueQuery<TModelSilk, TClient, TInputI>
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
      BobbinCreateMutation<TModelSilk, TClient, TInputI>
    >[]
  } = {}): BobbinCreateMutation<TModelSilk, TClient, TInputI> {
    input ??= silk(() => gt.nonNull(this.typeWeaver.createArgs()))

    const output = PrismaWeaver.unravel(this.silk.model, this.modelData)

    return loom.mutation(output.nullable(), {
      ...options,
      input,
      resolve: (input) => this.delegate.create(input),
    }) as BobbinCreateMutation<TModelSilk, TClient, TInputI>
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
      BobbinCreateManyMutation<TModelSilk, TClient, TInputI>
    >[]
  } = {}): BobbinCreateManyMutation<TModelSilk, TClient, TInputI> {
    input ??= silk(() => gt.nonNull(this.typeWeaver.createManyArgs()))

    const output = PrismaModelBobbin.batchPayloadSilk()

    return loom.mutation(output, {
      ...options,
      input,
      resolve: (input) => this.delegate.createMany(input),
    }) as BobbinCreateManyMutation<TModelSilk, TClient, TInputI>
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
      BobbinDeleteMutation<TModelSilk, TClient, TInputI>
    >[]
  } = {}): BobbinDeleteMutation<TModelSilk, TClient, TInputI> {
    input ??= silk(() => gt.nonNull(this.typeWeaver.deleteArgs()))

    const output = PrismaWeaver.unravel(this.silk.model, this.modelData)

    return loom.mutation(output.nullable(), {
      ...options,
      input,
      resolve: async (input) => {
        // we should return null if the row is not found
        // https://github.com/prisma/prisma/issues/4072
        try {
          return await this.delegate.delete(input)
        } catch (_err) {
          return null
        }
      },
    }) as BobbinDeleteMutation<TModelSilk, TClient, TInputI>
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
      BobbinDeleteManyMutation<TModelSilk, TClient, TInputI>
    >[]
  } = {}): BobbinDeleteManyMutation<TModelSilk, TClient, TInputI> {
    input ??= silk(() => gt.nonNull(this.typeWeaver.deleteManyArgs()))
    const output = PrismaModelBobbin.batchPayloadSilk()
    return loom.mutation(output, {
      ...options,
      input,
      resolve: async (input) => {
        return await this.delegate.deleteMany(input)
      },
    })
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
      BobbinUpdateMutation<TModelSilk, TClient, TInputI>
    >[]
  } = {}): BobbinUpdateMutation<TModelSilk, TClient, TInputI> {
    input ??= silk(() => gt.nonNull(this.typeWeaver.updateArgs()))
    const output = PrismaWeaver.unravel(this.silk.model, this.modelData)
    return loom.mutation(output, {
      ...options,
      input,
      resolve: (input) => this.delegate.update(input),
    }) as BobbinUpdateMutation<TModelSilk, TClient, TInputI>
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
      BobbinUpdateManyMutation<TModelSilk, TClient, TInputI>
    >[]
  } = {}): BobbinUpdateManyMutation<TModelSilk, TClient, TInputI> {
    input ??= silk(() => gt.nonNull(this.typeWeaver.updateManyArgs()))
    const output = PrismaModelBobbin.batchPayloadSilk()

    return loom.mutation(output, {
      ...options,
      input,
      resolve: (input) => this.delegate.updateMany(input),
    })
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
      BobbinUpsertMutation<TModelSilk, TClient, TInputI>
    >[]
  } = {}): BobbinUpsertMutation<TModelSilk, TClient, TInputI> {
    input ??= silk(() => gt.nonNull(this.typeWeaver.upsertArgs()))
    const output = PrismaWeaver.unravel(this.silk.model, this.modelData)
    return loom.mutation(output, {
      ...options,
      input,
      resolve: (input) => this.delegate.upsert(input),
    }) as BobbinUpsertMutation<TModelSilk, TClient, TInputI>
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

  static batchPayloadSilk(): GraphQLSilk<IBatchPayload, IBatchPayload> {
    return silk(() => PrismaActionArgsWeaver.batchPayload()) as GraphQLSilk<
      IBatchPayload,
      IBatchPayload
    >
  }
}

export interface BobbinRelationField<
  TModelSilk extends PrismaModelSilk<any, string, Record<string, any>>,
  TKey extends keyof NonNullable<TModelSilk["relations"]>,
> extends FieldOrOperation<
    TModelSilk,
    GraphQLSilk<NonNullable<TModelSilk["relations"]>[TKey]>,
    undefined,
    "field"
  > {}

export interface BobbinCountQuery<
  TModelSilk extends PrismaModelSilk<any, string, Record<string, any>>,
  TClient extends PrismaClient,
  TInputI = InferDelegateCountArgs<
    InferPrismaDelegate<TClient, TModelSilk["name"]>
  >,
> extends FieldOrOperation<
    undefined,
    GraphQLSilk<number>,
    GraphQLSilk<
      InferDelegateCountArgs<InferPrismaDelegate<TClient, TModelSilk["name"]>>,
      TInputI
    >,
    "query"
  > {}

export interface BobbinFindFirstQuery<
  TModelSilk extends PrismaModelSilk<any, string, Record<string, any>>,
  TClient extends PrismaClient,
  TInputI = InferDelegateFindFirstArgs<
    InferPrismaDelegate<TClient, TModelSilk["name"]>
  >,
> extends FieldOrOperation<
    undefined,
    ReturnType<TModelSilk["nullable"]>,
    GraphQLSilk<
      InferDelegateFindFirstArgs<
        InferPrismaDelegate<TClient, TModelSilk["name"]>
      >,
      TInputI
    >,
    "query"
  > {}

export interface BobbinFindManyQuery<
  TModelSilk extends PrismaModelSilk<any, string, Record<string, any>>,
  TClient extends PrismaClient,
  TInputI = InferDelegateFindManyArgs<
    InferPrismaDelegate<TClient, TModelSilk["name"]>
  >,
> extends FieldOrOperation<
    undefined,
    ReturnType<TModelSilk["list"]>,
    GraphQLSilk<
      InferDelegateFindManyArgs<
        InferPrismaDelegate<TClient, TModelSilk["name"]>
      >,
      TInputI
    >,
    "query"
  > {}

export interface BobbinFindUniqueQuery<
  TModelSilk extends PrismaModelSilk<any, string, Record<string, any>>,
  TClient extends PrismaClient,
  TInputI = InferDelegateFindUniqueArgs<
    InferPrismaDelegate<TClient, TModelSilk["name"]>
  >,
> extends FieldOrOperation<
    undefined,
    ReturnType<TModelSilk["nullable"]>,
    GraphQLSilk<
      InferDelegateFindUniqueArgs<
        InferPrismaDelegate<TClient, TModelSilk["name"]>
      >,
      TInputI
    >,
    "query"
  > {}

export interface BobbinCreateMutation<
  TModelSilk extends PrismaModelSilk<any, string, Record<string, any>>,
  TClient extends PrismaClient,
  TInputI = InferDelegateCreateArgs<
    InferPrismaDelegate<TClient, TModelSilk["name"]>
  >,
> extends FieldOrOperation<
    undefined,
    TModelSilk,
    GraphQLSilk<
      InferDelegateCreateArgs<InferPrismaDelegate<TClient, TModelSilk["name"]>>,
      TInputI
    >,
    "mutation"
  > {}

export interface BobbinCreateManyMutation<
  TModelSilk extends PrismaModelSilk<any, string, Record<string, any>>,
  TClient extends PrismaClient,
  TInputI = InferDelegateCreateManyArgs<
    InferPrismaDelegate<TClient, TModelSilk["name"]>
  >,
> extends FieldOrOperation<
    undefined,
    GraphQLSilk<IBatchPayload, IBatchPayload>,
    GraphQLSilk<
      InferDelegateCreateManyArgs<
        InferPrismaDelegate<TClient, TModelSilk["name"]>
      >,
      TInputI
    >,
    "mutation"
  > {}
export interface BobbinDeleteMutation<
  TModelSilk extends PrismaModelSilk<any, string, Record<string, any>>,
  TClient extends PrismaClient,
  TInputI = InferDelegateDeleteArgs<
    InferPrismaDelegate<TClient, TModelSilk["name"]>
  >,
> extends FieldOrOperation<
    undefined,
    ReturnType<TModelSilk["nullable"]>,
    GraphQLSilk<
      InferDelegateDeleteArgs<InferPrismaDelegate<TClient, TModelSilk["name"]>>,
      TInputI
    >,
    "mutation"
  > {}

export interface BobbinDeleteManyMutation<
  TModelSilk extends PrismaModelSilk<any, string, Record<string, any>>,
  TClient extends PrismaClient,
  TInputI = InferDelegateDeleteManyArgs<
    InferPrismaDelegate<TClient, TModelSilk["name"]>
  >,
> extends FieldOrOperation<
    undefined,
    GraphQLSilk<IBatchPayload, IBatchPayload>,
    GraphQLSilk<
      InferDelegateDeleteManyArgs<
        InferPrismaDelegate<TClient, TModelSilk["name"]>
      >,
      TInputI
    >,
    "mutation"
  > {}

export interface BobbinUpdateMutation<
  TModelSilk extends PrismaModelSilk<any, string, Record<string, any>>,
  TClient extends PrismaClient,
  TInputI = InferDelegateUpdateArgs<
    InferPrismaDelegate<TClient, TModelSilk["name"]>
  >,
> extends FieldOrOperation<
    undefined,
    TModelSilk,
    GraphQLSilk<
      InferDelegateUpdateArgs<InferPrismaDelegate<TClient, TModelSilk["name"]>>,
      TInputI
    >,
    "mutation"
  > {}

export interface BobbinUpdateManyMutation<
  TModelSilk extends PrismaModelSilk<any, string, Record<string, any>>,
  TClient extends PrismaClient,
  TInputI = InferDelegateUpdateManyArgs<
    InferPrismaDelegate<TClient, TModelSilk["name"]>
  >,
> extends FieldOrOperation<
    undefined,
    GraphQLSilk<IBatchPayload, IBatchPayload>,
    GraphQLSilk<
      InferDelegateUpdateManyArgs<
        InferPrismaDelegate<TClient, TModelSilk["name"]>
      >,
      TInputI
    >,
    "mutation"
  > {}

export interface BobbinUpsertMutation<
  TModelSilk extends PrismaModelSilk<any, string, Record<string, any>>,
  TClient extends PrismaClient,
  TInputI = InferDelegateUpsertArgs<
    InferPrismaDelegate<TClient, TModelSilk["name"]>
  >,
> extends FieldOrOperation<
    undefined,
    GraphQLSilk<IBatchPayload, IBatchPayload>,
    GraphQLSilk<
      InferDelegateUpsertArgs<InferPrismaDelegate<TClient, TModelSilk["name"]>>,
      TInputI
    >,
    "mutation"
  > {}

export type BobbinResolver<
  TModelSilk extends PrismaModelSilk<any, string, Record<string, any>>,
  TClient extends PrismaClient,
> = {
  [TKey in keyof NonNullable<TModelSilk["relations"]>]-?: BobbinRelationField<
    TModelSilk,
    TKey
  >
} & {
  [key in `count${Capitalize<TModelSilk["name"]>}`]: BobbinCountQuery<
    TModelSilk,
    TClient
  >
} & {
  [key in `findFirst${Capitalize<TModelSilk["name"]>}`]: BobbinFindFirstQuery<
    TModelSilk,
    TClient
  >
} & {
  [key in `findMany${Capitalize<TModelSilk["name"]>}`]: BobbinFindManyQuery<
    TModelSilk,
    TClient
  >
} & {
  [key in `findUnique${Capitalize<TModelSilk["name"]>}`]: BobbinFindUniqueQuery<
    TModelSilk,
    TClient
  >
} & {
  [key in `create${Capitalize<TModelSilk["name"]>}`]: BobbinCreateMutation<
    TModelSilk,
    TClient
  >
} & {
  [key in `createMany${Capitalize<TModelSilk["name"]>}`]: BobbinCreateManyMutation<
    TModelSilk,
    TClient
  >
} & {
  [key in `delete${Capitalize<TModelSilk["name"]>}`]: BobbinDeleteMutation<
    TModelSilk,
    TClient
  >
} & {
  [key in `deleteMany${Capitalize<TModelSilk["name"]>}`]: BobbinDeleteManyMutation<
    TModelSilk,
    TClient
  >
} & {
  [key in `update${Capitalize<TModelSilk["name"]>}`]: BobbinUpdateMutation<
    TModelSilk,
    TClient
  >
} & {
  [key in `updateMany${Capitalize<TModelSilk["name"]>}`]: BobbinUpdateManyMutation<
    TModelSilk,
    TClient
  >
} & {
  [key in `upsert${Capitalize<TModelSilk["name"]>}`]: BobbinUpsertMutation<
    TModelSilk,
    TClient
  >
}
