import type { GraphQLInputObjectType, GraphQLObjectType } from "graphql"
import type { AnyGraphQLSilk, OperationOrField, InputSchema } from "../resolver"

export type SilkOperationOrField = OperationOrField<
  any,
  AnyGraphQLSilk,
  InputSchema<AnyGraphQLSilk>
>

export type InputMap = Map<
  string,
  [origin: GraphQLObjectType, input: GraphQLInputObjectType]
>

export interface FieldConvertOptions {
  optionsForGetType?: Record<string | number | symbol, any>
  objectMap?: Map<string, GraphQLObjectType>
  inputMap?: InputMap
}
