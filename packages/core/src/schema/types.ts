import type { GraphQLInputObjectType, GraphQLObjectType } from "graphql"
import type { OperationOrField, ResolvingOptions } from "../resolver"

export type SilkOperationOrField = OperationOrField<any, any, any, any>

export type InputMap = WeakMap<GraphQLObjectType, GraphQLInputObjectType>

export interface FieldConvertOptions {
  optionsForGetType?: Record<string | number | symbol, any>
  optionsForResolving?: ResolvingOptions
  objectMap?: Map<string, GraphQLObjectType>
  inputMap?: InputMap
}
