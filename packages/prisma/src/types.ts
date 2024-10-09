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
  data: PrismaDataModel
  name: TName

  relations?: TRelation
}

export type InferPrismaModelSilkRelations<T extends PrismaModelSilk<any, any>> =
  NonNullable<T["relations"]>

export interface PrismaEnumSilk<TEnum> extends GraphQLSilk<TEnum> {
  enumType: DMMF.DatamodelEnum
}

export interface PrismaWeaverConfigOptions {
  presetGraphQLType?: (field: DMMF.Field) => GraphQLOutputType | undefined
}

export interface PrismaWeaverConfig
  extends WeaverConfig,
    PrismaWeaverConfigOptions {
  [SYMBOLS.WEAVER_CONFIG]: "gqloom.prisma"
}

export interface PrismaDataModel {
  models: Record<string, DMMF.Model>
  enums: Record<string, DMMF.DatamodelEnum>
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
> = TClient extends PrismaClient & { [key in TName]: PrismaDelegate }
  ? TClient[TName]
  : PrismaDelegate

export type InferDelegateCountArgs<TDelegate> = TDelegate extends {
  count: (args: infer TArgs) => any
}
  ? TArgs
  : never
