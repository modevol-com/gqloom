import {
  type SchemaWithPipe,
  type SchemaWithPipeAsync,
  type BaseSchema,
  type PipeItem,
  type BaseTransformation,
  type BaseIssue,
  type BaseSchemaAsync,
  type PipeItemAsync,
} from "valibot"

import { type GraphQLFieldConfig } from "graphql"

export type PipedSchema =
  | SchemaWithPipe<
      [
        BaseSchema<unknown, unknown, BaseIssue<unknown>>,
        ...PipeItem<unknown, unknown, BaseIssue<unknown>>[],
      ]
    >
  | SchemaWithPipeAsync<
      [
        BaseSchemaAsync<unknown, unknown, BaseIssue<unknown>>,
        ...PipeItem<unknown, unknown, BaseIssue<unknown>>[],
      ]
    >
  | BaseSchema<unknown, unknown, BaseIssue<unknown>>
  | BaseSchemaAsync<unknown, unknown, BaseIssue<unknown>>

export class ValibotMetadataCollector {
  static getFieldConfig(
    ...schemas: PipedSchema[]
  ): Partial<GraphQLFieldConfig<any, any, any>> | undefined {
    const pipe = ValibotMetadataCollector.getPipe(...schemas)

    for (const item of pipe) {
      if (item.type === "gqloom.asField") {
        return (item as AsFieldMetadata<unknown>).config
      }
    }
  }

  static isInteger(...schemas: PipedSchema[]): boolean {
    const pipe = ValibotMetadataCollector.getPipe(...schemas)
    return pipe.some((item) => item.type === "integer")
  }

  static IDActionTypes: Set<string> = new Set(["cuid2", "ulid", "uuid"])

  static isID(...schemas: PipedSchema[]): boolean {
    const pipe = ValibotMetadataCollector.getPipe(...schemas)
    return pipe.some((item) =>
      ValibotMetadataCollector.IDActionTypes.has(item.type)
    )
  }

  static getPipe(...schemas: (PipedSchema | undefined)[]) {
    const pipe: (
      | PipeItemAsync<unknown, unknown, BaseIssue<unknown>>
      | PipeItem<unknown, unknown, BaseIssue<unknown>>
    )[] = []
    for (const schema of schemas) {
      if (schema == null) continue
      if ("pipe" in schema) {
        pipe.push(...schema.pipe)
      }
    }
    return pipe
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
