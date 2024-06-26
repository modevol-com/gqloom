import { type GraphQLSilk, type FieldOrOperation } from "@gqloom/core"
import { type RequiredEntityData, type EntitySchema } from "@mikro-orm/core"
import { type InferEntity } from "./types"

export class MikroOperationWeaver {}

export interface MikroOperationShuttles {
  create: MikroCreateShuttle
}

export interface MikroCreateShuttle {
  <
    TSchema extends EntitySchema<any, any> & GraphQLSilk,
    TInput extends GraphQLSilk<
      RequiredEntityData<InferEntity<TSchema>>
    > = GraphQLSilk<
      RequiredEntityData<InferEntity<TSchema>>,
      RequiredEntityData<InferEntity<TSchema>>
    >,
  >(
    entitySchemaSilk: TSchema,
    inputSilk?: TInput
  ): FieldOrOperation<undefined, TSchema, TInput, "query">
}
