import { type GraphQLSilk, type SYMBOLS, type WeaverConfig } from "@gqloom/core"
import { type DMMF } from "@prisma/generator-helper"
import { type GraphQLOutputType } from "graphql"

export interface PrismaModelSilk<
  TModel,
  TName extends string = string,
  TRelation extends Record<string, any> = {},
> extends GraphQLSilk<TModel> {
  nullable(): GraphQLSilk<TModel | null>
  list(): GraphQLSilk<TModel[]>

  model: DMMF.Model
  data: PrismaModelMeta
  name: TName

  relations?: TRelation
}

export type InferPrismaModelSilkRelations<T extends PrismaModelSilk<any, any>> =
  NonNullable<T["relations"]>

export interface PrismaEnumSilk<TEnum> extends GraphQLSilk<TEnum> {
  enumType: DMMF.DatamodelEnum
}

export interface PrismaWeaverConfigOptions {
  presetGraphQLType?: (
    type: string,
    field?: DMMF.Field
  ) => GraphQLOutputType | undefined
}

export interface PrismaWeaverConfig
  extends WeaverConfig,
    PrismaWeaverConfigOptions {
  [SYMBOLS.WEAVER_CONFIG]: "gqloom.prisma"
}

export interface PrismaModelMeta {
  models: Record<string, DMMF.Model>
  enums: Record<string, DMMF.DatamodelEnum>
  schema: DMMF.Schema

  inputTypes?: Map<string, DMMF.InputType>
}

export interface PrismaClient {
  $connect: () => Promise<void>

  $disconnect: () => Promise<void>
}

export interface PrismaDelegate {
  findUnique: (args: { where: any }) => any
  findUniqueOrThrow: (args: { where: any }) => any
  count: (args: any) => any
}

export type InferPrismaDelegate<
  TClient extends PrismaClient,
  TName extends string,
> = TClient extends { [key in TName]: any } ? TClient[TName] : never

export type InferDelegateCountArgs<TDelegate> = TDelegate extends {
  count: (args: infer TArgs) => any
}
  ? TArgs
  : never

export type InferDelegateFindFirstArgs<TDelegate> = TDelegate extends {
  findFirst: (args: infer TArgs) => any
}
  ? TArgs
  : never

export type InferDelegateFindManyArgs<TDelegate> = TDelegate extends {
  findMany: (args: infer TArgs) => any
}
  ? TArgs
  : never

export type InferDelegateFindUniqueArgs<TDelegate> = TDelegate extends {
  findUnique: (args: infer TArgs) => any
}
  ? TArgs
  : never

export type InferDelegateCreateArgs<TDelegate> = TDelegate extends {
  create: (args: infer TArgs) => any
}
  ? TArgs
  : never

export type InferDelegateCreateManyArgs<TDelegate> = TDelegate extends {
  createMany: (args: infer TArgs) => any
}
  ? TArgs
  : never

export type InferDelegateDeleteArgs<TDelegate> = TDelegate extends {
  delete: (args: infer TArgs) => any
}
  ? TArgs
  : never

export type InferDelegateDeleteManyArgs<TDelegate> = TDelegate extends {
  deleteMany: (args: infer TArgs) => any
}
  ? TArgs
  : never

export type InferDelegateUpdateArgs<TDelegate> = TDelegate extends {
  update: (args: infer TArgs) => any
}
  ? TArgs
  : never

export type InferDelegateUpdateManyArgs<TDelegate> = TDelegate extends {
  updateMany: (args: infer TArgs) => any
}
  ? TArgs
  : never

export type InferDelegateUpsertArgs<TDelegate> = TDelegate extends {
  upsert: (args: infer TArgs) => any
}
  ? TArgs
  : never

export interface IBatchPayload {
  count: number
}
