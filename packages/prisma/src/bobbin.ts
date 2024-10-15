import { type DMMF } from "@prisma/generator-helper"
import { PrismaWeaver } from "."
import {
  type PrismaModelMeta,
  type PrismaClient,
  type PrismaModelSilk,
  type PrismaDelegate,
  type InferPrismaDelegate,
  type InferDelegateCountArgs,
  type InferDelegateFindFirstArgs,
  type InferDelegateFindManyArgs,
  type InferDelegateFindUniqueArgs,
  type InferDelegateCreateArgs,
  type InferDelegateCreateManyArgs,
  type IBatchPayload,
  type InferDelegateDeleteArgs,
  type InferDelegateDeleteManyArgs,
  type InferDelegateUpdateArgs,
  type InferDelegateUpdateManyArgs,
  type InferDelegateUpsertArgs,
} from "./types"
import {
  type InferSilkO,
  type FieldOrOperation,
  type GraphQLSilk,
  type GraphQLFieldOptions,
  type Middleware,
  silk,
  loom,
} from "@gqloom/core"
import { GraphQLInt, GraphQLNonNull } from "graphql"
import { PrismaActionArgsWeaver } from "./type-weaver"
import { capitalize } from "./utils"

export class PrismaModelBobbin<
  TModalSilk extends PrismaModelSilk<any, string, Record<string, any>>,
  TClient extends PrismaClient,
> {
  protected modelData: PrismaModelMeta
  protected delegate: InferPrismaDelegate<TClient, TModalSilk["name"]>
  protected typeWeaver: PrismaActionArgsWeaver

  constructor(
    protected readonly silk: TModalSilk,
    protected readonly client: TClient
  ) {
    this.modelData = silk.meta
    this.delegate = PrismaModelBobbin.getDelegate(
      silk.model.name,
      client
    ) as InferPrismaDelegate<TClient, TModalSilk["name"]>
    this.typeWeaver = new PrismaActionArgsWeaver(silk)
  }

  public relationField<TKey extends keyof NonNullable<TModalSilk["relations"]>>(
    key: TKey,
    options: {
      middlewares?: Middleware<
        FieldOrOperation<
          TModalSilk,
          GraphQLSilk<NonNullable<TModalSilk["relations"]>[TKey]>,
          undefined,
          "field"
        >
      >[]
    } & GraphQLFieldOptions = {}
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

  public countQuery<
    TInputI = InferDelegateCountArgs<
      InferPrismaDelegate<TClient, TModalSilk["name"]>
    >,
  >({
    input,
    ...options
  }: {
    input?: GraphQLSilk<
      InferDelegateCountArgs<InferPrismaDelegate<TClient, TModalSilk["name"]>>,
      TInputI
    >
    middlewares?: Middleware<BobbinCountQuery<TModalSilk, TClient, TInputI>>[]
  } & GraphQLFieldOptions = {}): BobbinCountQuery<
    TModalSilk,
    TClient,
    TInputI
  > {
    input ??= silk(this.typeWeaver.countArgs()) as GraphQLSilk<
      InferDelegateCountArgs<InferPrismaDelegate<TClient, TModalSilk["name"]>>,
      TInputI
    >

    return loom.query(silk<number>(new GraphQLNonNull(GraphQLInt)), {
      ...options,
      input,
      resolve: (input) => this.delegate.count(input),
    })
  }

  public findFirstQuery<
    TInputI = InferDelegateFindFirstArgs<
      InferPrismaDelegate<TClient, TModalSilk["name"]>
    >,
  >({
    input,
    ...options
  }: {
    input?: GraphQLSilk<
      InferDelegateFindFirstArgs<
        InferPrismaDelegate<TClient, TModalSilk["name"]>
      >,
      TInputI
    >
    middlewares?: Middleware<
      BobbinFindFirstQuery<TModalSilk, TClient, TInputI>
    >[]
  } & GraphQLFieldOptions = {}): BobbinFindFirstQuery<
    TModalSilk,
    TClient,
    TInputI
  > {
    input ??= silk(this.typeWeaver.findFirstArgs())

    const output = PrismaWeaver.unravel(this.silk.model, this.modelData)

    return loom.query(output.nullable(), {
      ...options,
      input,
      resolve: (input) => this.delegate.findFirst(input),
    }) as BobbinFindFirstQuery<TModalSilk, TClient, TInputI>
  }

  public findManyQuery<
    TInputI = InferDelegateFindManyArgs<
      InferPrismaDelegate<TClient, TModalSilk["name"]>
    >,
  >({
    input,
    ...options
  }: {
    input?: GraphQLSilk<
      InferDelegateFindManyArgs<
        InferPrismaDelegate<TClient, TModalSilk["name"]>
      >,
      TInputI
    >
    middlewares?: Middleware<
      BobbinFindManyQuery<TModalSilk, TClient, TInputI>
    >[]
  } & GraphQLFieldOptions = {}): BobbinFindManyQuery<
    TModalSilk,
    TClient,
    TInputI
  > {
    input ??= silk(this.typeWeaver.findManyArgs())

    const output = PrismaWeaver.unravel(this.silk.model, this.modelData)

    return loom.query(output.list(), {
      ...options,
      input,
      resolve: (input) => this.delegate.findMany(input),
    }) as BobbinFindManyQuery<TModalSilk, TClient, TInputI>
  }

  public findUniqueQuery<
    TInputI = InferDelegateFindUniqueArgs<
      InferPrismaDelegate<TClient, TModalSilk["name"]>
    >,
  >({
    input,
    ...options
  }: {
    input?: GraphQLSilk<
      InferDelegateFindUniqueArgs<
        InferPrismaDelegate<TClient, TModalSilk["name"]>
      >,
      TInputI
    >
    middlewares?: Middleware<
      BobbinFindUniqueQuery<TModalSilk, TClient, TInputI>
    >[]
  } & GraphQLFieldOptions = {}): BobbinFindUniqueQuery<
    TModalSilk,
    TClient,
    TInputI
  > {
    input ??= silk(this.typeWeaver.findUniqueArgs())

    const output = PrismaWeaver.unravel(this.silk.model, this.modelData)

    return loom.query(output.nullable(), {
      ...options,
      input,
      resolve: (input) => this.delegate.findUnique(input),
    }) as BobbinFindUniqueQuery<TModalSilk, TClient, TInputI>
  }

  public createMutation<
    TInputI = InferDelegateCreateArgs<
      InferPrismaDelegate<TClient, TModalSilk["name"]>
    >,
  >({
    input,
    ...options
  }: {
    input?: GraphQLSilk<
      InferDelegateCreateArgs<InferPrismaDelegate<TClient, TModalSilk["name"]>>,
      TInputI
    >
    middlewares?: Middleware<
      FieldOrOperation<
        undefined,
        TModalSilk,
        GraphQLSilk<
          InferDelegateCreateArgs<
            InferPrismaDelegate<TClient, TModalSilk["name"]>
          >,
          TInputI
        >,
        "mutation"
      >
    >[]
  } & GraphQLFieldOptions = {}): FieldOrOperation<
    undefined,
    TModalSilk,
    GraphQLSilk<
      InferDelegateCreateArgs<InferPrismaDelegate<TClient, TModalSilk["name"]>>,
      TInputI
    >,
    "mutation"
  > {
    input ??= silk(new GraphQLNonNull(this.typeWeaver.createArgs()))

    const output = PrismaWeaver.unravel(this.silk.model, this.modelData)

    return loom.mutation(output.nullable(), {
      ...options,
      input,
      resolve: (input) => this.delegate.create(input),
    }) as FieldOrOperation<
      undefined,
      TModalSilk,
      GraphQLSilk<
        InferDelegateCreateArgs<
          InferPrismaDelegate<TClient, TModalSilk["name"]>
        >,
        TInputI
      >,
      "mutation"
    >
  }

  public createManyMutation<
    TInputI = InferDelegateCreateManyArgs<
      InferPrismaDelegate<TClient, TModalSilk["name"]>
    >,
  >({
    input,
    ...options
  }: {
    input?: GraphQLSilk<
      InferDelegateCreateManyArgs<
        InferPrismaDelegate<TClient, TModalSilk["name"]>
      >,
      TInputI
    >
    middlewares?: Middleware<
      FieldOrOperation<
        undefined,
        GraphQLSilk<IBatchPayload, IBatchPayload>,
        GraphQLSilk<
          InferDelegateCreateManyArgs<
            InferPrismaDelegate<TClient, TModalSilk["name"]>
          >,
          TInputI
        >,
        "mutation"
      >
    >[]
  } & GraphQLFieldOptions = {}): FieldOrOperation<
    undefined,
    GraphQLSilk<IBatchPayload, IBatchPayload>,
    GraphQLSilk<
      InferDelegateCreateManyArgs<
        InferPrismaDelegate<TClient, TModalSilk["name"]>
      >,
      TInputI
    >,
    "mutation"
  > {
    input ??= silk(new GraphQLNonNull(this.typeWeaver.createManyArgs()))

    const output = silk(PrismaActionArgsWeaver.batchPayload()) as GraphQLSilk<
      IBatchPayload,
      IBatchPayload
    >

    return loom.mutation(output, {
      ...options,
      input,
      resolve: (input) => this.delegate.createMany(input),
    }) as FieldOrOperation<
      undefined,
      GraphQLSilk<IBatchPayload, IBatchPayload>,
      GraphQLSilk<
        InferDelegateCreateManyArgs<
          InferPrismaDelegate<TClient, TModalSilk["name"]>
        >,
        TInputI
      >,
      "mutation"
    >
  }

  public deleteMutation<
    TInputI = InferDelegateDeleteArgs<
      InferPrismaDelegate<TClient, TModalSilk["name"]>
    >,
  >({
    input,
    ...options
  }: {
    input?: GraphQLSilk<
      InferDelegateDeleteArgs<InferPrismaDelegate<TClient, TModalSilk["name"]>>,
      TInputI
    >
    middlewares?: Middleware<
      FieldOrOperation<
        undefined,
        ReturnType<TModalSilk["nullable"]>,
        GraphQLSilk<
          InferDelegateDeleteArgs<
            InferPrismaDelegate<TClient, TModalSilk["name"]>
          >,
          TInputI
        >,
        "mutation"
      >
    >[]
  } & GraphQLFieldOptions = {}): FieldOrOperation<
    undefined,
    ReturnType<TModalSilk["nullable"]>,
    GraphQLSilk<
      InferDelegateDeleteArgs<InferPrismaDelegate<TClient, TModalSilk["name"]>>,
      TInputI
    >,
    "mutation"
  > {
    input ??= silk(new GraphQLNonNull(this.typeWeaver.deleteArgs()))

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
    }) as FieldOrOperation<
      undefined,
      ReturnType<TModalSilk["nullable"]>,
      GraphQLSilk<
        InferDelegateDeleteArgs<
          InferPrismaDelegate<TClient, TModalSilk["name"]>
        >,
        TInputI
      >,
      "mutation"
    >
  }

  public deleteManyMutation<
    TInputI = InferDelegateDeleteManyArgs<
      InferPrismaDelegate<TClient, TModalSilk["name"]>
    >,
  >({
    input,
    ...options
  }: {
    input?: GraphQLSilk<
      InferDelegateDeleteManyArgs<
        InferPrismaDelegate<TClient, TModalSilk["name"]>
      >,
      TInputI
    >
    middlewares?: Middleware<
      FieldOrOperation<
        undefined,
        GraphQLSilk<IBatchPayload, IBatchPayload>,
        GraphQLSilk<
          InferDelegateDeleteManyArgs<
            InferPrismaDelegate<TClient, TModalSilk["name"]>
          >,
          TInputI
        >,
        "mutation"
      >
    >[]
  } & GraphQLFieldOptions = {}): FieldOrOperation<
    undefined,
    GraphQLSilk<IBatchPayload, IBatchPayload>,
    GraphQLSilk<
      InferDelegateDeleteManyArgs<
        InferPrismaDelegate<TClient, TModalSilk["name"]>
      >,
      TInputI
    >,
    "mutation"
  > {
    input ??= silk(new GraphQLNonNull(this.typeWeaver.deleteManyArgs()))
    const output = silk(PrismaActionArgsWeaver.batchPayload()) as GraphQLSilk<
      IBatchPayload,
      IBatchPayload
    >
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
      InferPrismaDelegate<TClient, TModalSilk["name"]>
    >,
  >({
    input,
    ...options
  }: {
    input?: GraphQLSilk<
      InferDelegateUpdateArgs<InferPrismaDelegate<TClient, TModalSilk["name"]>>,
      TInputI
    >
    middlewares?: Middleware<
      FieldOrOperation<
        undefined,
        TModalSilk,
        GraphQLSilk<
          InferDelegateUpdateArgs<
            InferPrismaDelegate<TClient, TModalSilk["name"]>
          >,
          TInputI
        >,
        "mutation"
      >
    >[]
  } & GraphQLFieldOptions = {}): FieldOrOperation<
    undefined,
    TModalSilk,
    GraphQLSilk<
      InferDelegateUpdateArgs<InferPrismaDelegate<TClient, TModalSilk["name"]>>,
      TInputI
    >,
    "mutation"
  > {
    input ??= silk(new GraphQLNonNull(this.typeWeaver.updateArgs()))
    const output = PrismaWeaver.unravel(this.silk.model, this.modelData)
    return loom.mutation(output, {
      ...options,
      input,
      resolve: (input) => this.delegate.update(input),
    }) as FieldOrOperation<
      undefined,
      TModalSilk,
      GraphQLSilk<
        InferDelegateUpdateArgs<
          InferPrismaDelegate<TClient, TModalSilk["name"]>
        >,
        TInputI
      >,
      "mutation"
    >
  }

  public updateManyMutation<
    TInputI = InferDelegateUpdateManyArgs<
      InferPrismaDelegate<TClient, TModalSilk["name"]>
    >,
  >({
    input,
    ...options
  }: {
    input?: GraphQLSilk<
      InferDelegateUpdateManyArgs<
        InferPrismaDelegate<TClient, TModalSilk["name"]>
      >,
      TInputI
    >
    middlewares?: Middleware<
      FieldOrOperation<
        undefined,
        GraphQLSilk<IBatchPayload, IBatchPayload>,
        GraphQLSilk<
          InferDelegateUpdateManyArgs<
            InferPrismaDelegate<TClient, TModalSilk["name"]>
          >,
          TInputI
        >,
        "mutation"
      >
    >[]
  } & GraphQLFieldOptions = {}): FieldOrOperation<
    undefined,
    GraphQLSilk<IBatchPayload, IBatchPayload>,
    GraphQLSilk<
      InferDelegateUpdateManyArgs<
        InferPrismaDelegate<TClient, TModalSilk["name"]>
      >,
      TInputI
    >,
    "mutation"
  > {
    input ??= silk(new GraphQLNonNull(this.typeWeaver.updateManyArgs()))
    const output = silk(PrismaActionArgsWeaver.batchPayload()) as GraphQLSilk<
      IBatchPayload,
      IBatchPayload
    >

    return loom.mutation(output, {
      ...options,
      input,
      resolve: (input) => this.delegate.updateMany(input),
    })
  }

  public upsertMutation<
    TInputI = InferDelegateUpsertArgs<
      InferPrismaDelegate<TClient, TModalSilk["name"]>
    >,
  >({
    input,
    ...options
  }: {
    input?: GraphQLSilk<
      InferDelegateUpsertArgs<InferPrismaDelegate<TClient, TModalSilk["name"]>>,
      TInputI
    >
    middlewares?: Middleware<
      FieldOrOperation<
        undefined,
        GraphQLSilk<IBatchPayload, IBatchPayload>,
        GraphQLSilk<
          InferDelegateUpsertArgs<
            InferPrismaDelegate<TClient, TModalSilk["name"]>
          >,
          TInputI
        >,
        "mutation"
      >
    >[]
  } & GraphQLFieldOptions = {}): FieldOrOperation<
    undefined,
    TModalSilk,
    GraphQLSilk<
      InferDelegateUpsertArgs<InferPrismaDelegate<TClient, TModalSilk["name"]>>,
      TInputI
    >,
    "mutation"
  > {
    input ??= silk(new GraphQLNonNull(this.typeWeaver.upsertArgs()))
    const output = PrismaWeaver.unravel(this.silk.model, this.modelData)
    return loom.mutation(output, {
      ...options,
      input,
      resolve: (input) => this.delegate.upsert(input),
    }) as FieldOrOperation<
      undefined,
      TModalSilk,
      GraphQLSilk<
        InferDelegateUpsertArgs<
          InferPrismaDelegate<TClient, TModalSilk["name"]>
        >,
        TInputI
      >,
      "mutation"
    >
  }

  public resolver(): BobbinResolver<TModalSilk, TClient> {
    const name = capitalize(this.silk.name)
    return {
      [`count${name}`]: this.countQuery(),
      [`findFirst${name}`]: this.findFirstQuery(),
      [`findMany${name}`]: this.findManyQuery(),
      [`findUnique${name}`]: this.findUniqueQuery(),
    } as BobbinResolver<TModalSilk, TClient>
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

export interface BobbinCountQuery<
  TModalSilk extends PrismaModelSilk<any, string, Record<string, any>>,
  TClient extends PrismaClient,
  TInputI = InferDelegateCountArgs<
    InferPrismaDelegate<TClient, TModalSilk["name"]>
  >,
> extends FieldOrOperation<
    undefined,
    GraphQLSilk<number>,
    GraphQLSilk<
      InferDelegateCountArgs<InferPrismaDelegate<TClient, TModalSilk["name"]>>,
      TInputI
    >,
    "query"
  > {}

export interface BobbinFindFirstQuery<
  TModalSilk extends PrismaModelSilk<any, string, Record<string, any>>,
  TClient extends PrismaClient,
  TInputI = InferDelegateFindFirstArgs<
    InferPrismaDelegate<TClient, TModalSilk["name"]>
  >,
> extends FieldOrOperation<
    undefined,
    ReturnType<TModalSilk["nullable"]>,
    GraphQLSilk<
      InferDelegateFindFirstArgs<
        InferPrismaDelegate<TClient, TModalSilk["name"]>
      >,
      TInputI
    >,
    "query"
  > {}

export interface BobbinFindManyQuery<
  TModalSilk extends PrismaModelSilk<any, string, Record<string, any>>,
  TClient extends PrismaClient,
  TInputI = InferDelegateFindManyArgs<
    InferPrismaDelegate<TClient, TModalSilk["name"]>
  >,
> extends FieldOrOperation<
    undefined,
    ReturnType<TModalSilk["list"]>,
    GraphQLSilk<
      InferDelegateFindManyArgs<
        InferPrismaDelegate<TClient, TModalSilk["name"]>
      >,
      TInputI
    >,
    "query"
  > {}

export interface BobbinFindUniqueQuery<
  TModalSilk extends PrismaModelSilk<any, string, Record<string, any>>,
  TClient extends PrismaClient,
  TInputI = InferDelegateFindUniqueArgs<
    InferPrismaDelegate<TClient, TModalSilk["name"]>
  >,
> extends FieldOrOperation<
    undefined,
    ReturnType<TModalSilk["nullable"]>,
    GraphQLSilk<
      InferDelegateFindUniqueArgs<
        InferPrismaDelegate<TClient, TModalSilk["name"]>
      >,
      TInputI
    >,
    "query"
  > {}

export type BobbinResolver<
  TModalSilk extends PrismaModelSilk<any, string, Record<string, any>>,
  TClient extends PrismaClient,
> = {
  [key in `count${Capitalize<TModalSilk["name"]>}`]: BobbinCountQuery<
    TModalSilk,
    TClient
  >
} & {
  [key in `findFirst${Capitalize<TModalSilk["name"]>}`]: BobbinFindFirstQuery<
    TModalSilk,
    TClient
  >
} & {
  [key in `findMany${Capitalize<TModalSilk["name"]>}`]: BobbinFindManyQuery<
    TModalSilk,
    TClient
  >
} & {
  [key in `findUnique${Capitalize<TModalSilk["name"]>}`]: BobbinFindUniqueQuery<
    TModalSilk,
    TClient
  >
}
