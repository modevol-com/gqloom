import type { GraphQLFieldConfig } from "graphql"
import type { OperationOrField, AnyGraphQLSilk, InputSchema } from "../resolver"
import { getFieldOptions } from "../utils"

export function toFieldConfig(
  field: OperationOrField<any, AnyGraphQLSilk, InputSchema<AnyGraphQLSilk>>,
  options: Record<string | number | symbol, any> = {}
): GraphQLFieldConfig<any, any> {
  return {
    type: field.output.getType(options),
    ...getFieldOptions(field),
    // TODO: args, resolve, subscribe
  }
}

export function mapToFieldConfig(
  map: Map<
    string,
    OperationOrField<any, AnyGraphQLSilk, InputSchema<AnyGraphQLSilk>>
  >,
  options: Record<string | number | symbol, any> = {}
): Record<string, GraphQLFieldConfig<any, any>> {
  const record: Record<string, GraphQLFieldConfig<any, any>> = {}

  for (const [name, field] of map.entries()) {
    record[name] = toFieldConfig(field, options)
  }

  return record
}
