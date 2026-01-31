import type { GraphQLSilk, SYMBOLS, WeaverConfig } from "@gqloom/core"
import type { DMMF } from "@prisma/generator-helper"
import type {
  GraphQLFieldConfig,
  GraphQLObjectTypeConfig,
  GraphQLOutputType,
} from "graphql"

export interface PrismaModelSilk<
  TModel,
  TName extends string = string,
  TRelation extends Record<string, any> = {},
> extends GraphQLSilk<SelectiveModel<TModel, TName>> {
  nullable(): GraphQLSilk<SelectiveModel<TModel, TName> | null>
  list(): GraphQLSilk<SelectiveModel<TModel, TName>[]>

  config(options: PrismaModelConfigOptions<TModel>): PrismaModelConfig<TModel>

  model: DMMF.Model
  meta: PrismaModelMeta
  name: TName

  relations?: TRelation
}

export interface PrismaModelConfigOptions<TModel>
  extends Partial<Omit<GraphQLObjectTypeConfig<any, any>, "fields">> {
  fields?: Getter<{
    [K in keyof TModel]?: PrismaModelConfigOptionsField
  }>
}

export type PrismaModelConfigOptionsField =
  | (Omit<GraphQLFieldConfig<any, any>, "type"> & {
      /**
       * The type of the field, set to `null` to hide the field
       */
      type?:
        | Getter<
            GraphQLOutputType | GraphQLSilk | typeof SYMBOLS.FIELD_HIDDEN | null
          >
        | undefined
    })
  | typeof SYMBOLS.FIELD_HIDDEN
  | GraphQLOutputType
  | GraphQLSilk
  | undefined

export interface PrismaModelConfig<TModel>
  extends PrismaModelConfigOptions<TModel>,
    WeaverConfig {
  [SYMBOLS.WEAVER_CONFIG]: `gqloom.prisma.model.${string}`
}

export type AnyPrismaModelSilk = PrismaModelSilk<
  any,
  string,
  Record<string, any>
>

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
  enumTypes?: Map<string, DMMF.SchemaEnum>
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

export type InferTModelSilkName<TModelSilk extends AnyPrismaModelSilk> =
  TModelSilk extends { name: infer N }
    ? N extends string
      ? Capitalize<N>
      : never
    : never

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

export type SelectedModelFields<
  TSilk extends PrismaModelSilk<unknown, string, Record<string, unknown>>,
> =
  TSilk extends PrismaModelSilk<
    infer TModel,
    infer TName,
    Record<string, unknown>
  >
    ? {
        [K in `__selective_${TName}_brand__`]: true
      } & {
        [K in keyof TModel]?: false | undefined
      }
    : never

export type SelectiveModel<TModel, TName extends string> =
  | TModel
  | (Partial<TModel> & {
      [K in `__selective_${TName}_brand__`]: never
    })

export interface PrismaTypes {
  [key: string]: {
    [key: string]: unknown
  }
}

export type Getter<T> = T | (() => T)
