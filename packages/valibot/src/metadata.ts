import {
  type PipeItem,
  type BaseTransformation,
  type BaseIssue,
  type PipeItemAsync,
} from "valibot"

import {
  type GraphQLObjectTypeConfig,
  type GraphQLFieldConfig,
  type GraphQLEnumTypeConfig,
} from "graphql"
import { type PipedSchema } from "./types"
import { isNullish } from "./utils"
import { deepMerge, weaverContext } from "@gqloom/core"

export class ValibotMetadataCollector {
  static getFieldConfig(
    ...schemas: PipedSchema[]
  ): Partial<GraphQLFieldConfig<any, any, any>> | undefined {
    const pipe = ValibotMetadataCollector.getPipe(...schemas)

    let defaultValue: any
    let config: Partial<GraphQLFieldConfig<any, any, any>> | undefined

    for (const item of pipe) {
      if (item.kind === "schema" && isNullish(item)) {
        defaultValue ??= item.default
        if (defaultValue !== undefined && config !== undefined) break
      }
      if (item.type === "gqloom.asField") {
        config ??= (item as AsFieldMetadata<unknown>).config
        if (defaultValue !== undefined && config !== undefined) break
      }
    }

    return defaultValue !== undefined
      ? deepMerge(config, {
          extensions: { defaultValue },
        })
      : config
  }

  static getObjectConfig(
    ...schemas: PipedSchema[]
  ): AsObjectTypeMetadata<object>["config"] | undefined {
    return this.getConfig<AsObjectTypeMetadata<object>>(
      "gqloom.asObjectType",
      schemas
    )
  }

  static getEnumConfig(
    ...schemas: PipedSchema[]
  ): AsEnumTypeMetadata<object>["config"] | undefined {
    return this.getConfig<AsEnumTypeMetadata<object>>(
      "gqloom.asEnumType",
      schemas
    )
  }

  protected static getConfig<
    T extends AsEnumTypeMetadata<object> | AsObjectTypeMetadata<object>,
  >(configType: T["type"], schemas: PipedSchema[]): T["config"] | undefined {
    const pipe = ValibotMetadataCollector.getPipe(...schemas)

    let name: string | undefined
    for (const item of pipe) {
      name ??= weaverContext.names.get(item)
      if (item.type === configType) {
        const config = (item as T).config
        return {
          name: weaverContext.names.get(item),
          ...config,
        }
      }
    }

    if (name !== undefined) return { name }
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
      pipe.push(schema)
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

/**
 * GraphQL Object type metadata type.
 */
export interface AsObjectTypeMetadata<TInput extends object>
  extends BaseTransformation<TInput, TInput, never> {
  /**
   * The metadata type.
   */
  readonly type: "gqloom.asObjectType"
  /**
   * The metadata reference.
   */
  readonly reference: typeof asObjectType

  /**
   * The GraphQL Object type config.
   */
  readonly config: Partial<GraphQLObjectTypeConfig<any, any>>
}

/**
 * Creates a GraphQL object type metadata.
 *
 * @param config - The GraphQL object config.
 *
 * @returns A GraphQL object type metadata.
 */
export function asObjectType<TInput extends object>(
  config: AsObjectTypeMetadata<TInput>["config"]
): AsObjectTypeMetadata<TInput> {
  return {
    kind: "transformation",
    type: "gqloom.asObjectType",
    reference: asObjectType,
    async: false,
    _run: (dataset) => dataset,
    config,
  }
}

/**
 * GraphQL Object enum metadata type.
 */
export interface AsEnumTypeMetadata<TInput extends object>
  extends BaseTransformation<TInput, TInput, never> {
  /**
   * The metadata type.
   */
  readonly type: "gqloom.asEnumType"
  /**
   * The metadata reference.
   */
  readonly reference: typeof asEnumType

  /**
   * The GraphQL enum type config.
   */
  readonly config: Partial<GraphQLEnumTypeConfig>
}

/**
 * Creates a GraphQL enum type metadata.
 *
 * @param config - The GraphQL enum config.
 *
 * @returns A GraphQL enum type metadata.
 */
export function asEnumType<TInput extends object>(
  config: AsEnumTypeMetadata<TInput>["config"]
): AsEnumTypeMetadata<TInput> {
  return {
    kind: "transformation",
    type: "gqloom.asEnumType",
    reference: asEnumType,
    async: false,
    _run: (dataset) => dataset,
    config,
  }
}
