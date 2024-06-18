import {
  type SchemaWithPipe,
  type BaseSchema,
  type PipeItem,
  type BaseTransformation,
  type BaseIssue,
} from "valibot"

import { type GraphQLFieldConfig } from "graphql"

type PipedSchema =
  | SchemaWithPipe<
      [
        BaseSchema<unknown, unknown, BaseIssue<unknown>>,
        ...PipeItem<unknown, unknown, BaseIssue<unknown>>[],
      ]
    >
  | BaseSchema<unknown, unknown, BaseIssue<unknown>>

export class ValibotMetadataCollector {
  static getFieldConfig(
    schema: PipedSchema
  ): Partial<GraphQLFieldConfig<any, any, any>> | undefined {
    if (!("pipe" in schema)) return
    for (const item of schema.pipe) {
      if (item.type === "gqloom.asField") {
        return (item as AsFieldMetadata<unknown>).config
      }
    }
  }

  static isInteger(schema: PipedSchema): boolean {
    if (!("pipe" in schema)) return false
    return schema.pipe.some((item) => item.type === "integer")
  }

  static IDActionTypes: Set<string> = new Set(["cuid2", "ulid", "uuid"])

  static isID(schema: PipedSchema): boolean {
    if (!("pipe" in schema)) return false
    return schema.pipe.some((item) =>
      ValibotMetadataCollector.IDActionTypes.has(item.type)
    )
  }
}

/**
 * GraphQL field metadata type.
 */
export interface AsFieldMetadata<TInput>
  extends BaseTransformation<TInput, TInput, never> {
  /**
   * The metadata type.
   */
  readonly type: "gqloom.asField"
  /**
   * The metadata reference.
   */
  readonly reference: typeof asField

  /**
   * The GraphQL field config.
   */
  readonly config: Partial<GraphQLFieldConfig<any, any, any>>
}

/**
 * Creates a GraphQL field metadata.
 *
 * @param config - The GraphQL field config.
 *
 * @returns A GraphQL field metadata.
 */
export function asField<TInput>(
  config: Partial<GraphQLFieldConfig<any, any, any>>
): AsFieldMetadata<TInput> {
  return {
    kind: "transformation",
    type: "gqloom.asField",
    reference: asField,
    async: false,
    _run: (dataset) => dataset,
    config,
  }
}
