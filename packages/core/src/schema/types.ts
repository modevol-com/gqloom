import type { GraphQLInputObjectType, GraphQLObjectType } from "graphql"
import type { OperationOrField } from "../resolver"

export type SilkOperationOrField = OperationOrField<any, any, any, any>

export type InputMap = Map<
  string,
  [origin: GraphQLObjectType, input: GraphQLInputObjectType]
>

export interface FieldConvertOptions {
  optionsForGetType?: Record<string | number | symbol, any>
  objectMap?: Map<string, GraphQLObjectType>
  inputMap?: InputMap
}
