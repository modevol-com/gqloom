import { type SYMBOLS, deepMerge, weaverContext } from "@gqloom/core"
import type {
  GraphQLEnumTypeConfig,
  GraphQLEnumValueConfig,
  GraphQLFieldConfig,
  GraphQLInterfaceType,
  GraphQLObjectTypeConfig,
  GraphQLOutputType,
  GraphQLUnionTypeConfig,
} from "graphql"
import type {
  BaseIssue,
  BaseMetadata,
  DescriptionAction,
  GenericSchema,
  GenericSchemaAsync,
  PipeItem,
  PipeItemAsync,
} from "valibot"
import type { PipedSchema, SupportedSchema } from "./types"
import { isNullish } from "./utils"

export class ValibotMetadataCollector {
  public static getFieldConfig(
    ...schemas: PipedSchema[]
  ): FieldConfig | undefined {
    const pipe = ValibotMetadataCollector.getPipe(...schemas)

    let defaultValue: any
    let description: string | undefined
    let config: FieldConfig | undefined

    for (const item of pipe) {
      if (item.kind === "schema" && isNullish(item)) {
        defaultValue ??= item.default
        if (defaultValue !== undefined && config !== undefined) break
      }
      if (item.type === "gqloom.asField") {
        config ??= (item as AsFieldMetadata<unknown>).config
        if (defaultValue !== undefined && config !== undefined) break
      }
      if (item.type === "description") {
        description ??= (item as DescriptionAction<any, string>).description
      }
    }

    if (config) {
      config.description ??= description
    } else {
      config = { description }
    }

    return defaultValue !== undefined
      ? deepMerge(config, {
          extensions: { defaultValue },
        })
      : config
  }

  public static getObjectConfig(
    ...schemas: PipedSchema[]
  ): AsObjectTypeMetadata<object>["config"] | undefined {
    return ValibotMetadataCollector.getConfig<AsObjectTypeMetadata<object>>(
      "gqloom.asObjectType",
      schemas
    )
  }

  public static getEnumConfig(
    ...schemas: PipedSchema[]
  ): AsEnumTypeMetadata<any>["config"] | undefined {
    return ValibotMetadataCollector.getConfig<AsEnumTypeMetadata<any>>(
      "gqloom.asEnumType",
      schemas
    )
  }

  public static getUnionConfig(
    ...schemas: PipedSchema[]
  ): AsUnionTypeMetadata<object>["config"] | undefined {
    return ValibotMetadataCollector.getConfig<AsUnionTypeMetadata<object>>(
      "gqloom.asUnionType",
      schemas
    )
  }

  protected static getConfig<
    T extends
      | AsEnumTypeMetadata<any>
      | AsObjectTypeMetadata<object>
      | AsUnionTypeMetadata<object>,
  >(configType: T["type"], schemas: PipedSchema[]): T["config"] | undefined {
    const pipe = ValibotMetadataCollector.getPipe(...schemas)

    let name: string | undefined
    let description: string | undefined
    let config: T["config"] | undefined
    for (const item of pipe) {
      name ??=
        weaverContext.names.get(item) ??
        ValibotMetadataCollector.getTypenameByLiteral(item)
      if (item.type === configType) {
        config = (item as T).config
      } else if (item.type === "description") {
        description = (item as DescriptionAction<any, string>).description
      }
    }

    if (name !== undefined || description !== undefined)
      return { name, description, ...config } as T["config"]
    return config
  }

  protected static getTypenameByLiteral(
    item:
      | PipeItemAsync<unknown, unknown, BaseIssue<unknown>>
      | PipeItem<unknown, unknown, BaseIssue<unknown>>
  ): string | undefined {
    const schema = item as SupportedSchema
    if (
      schema.type === "object" &&
      "entries" in schema &&
      typeof schema.entries === "object" &&
      schema.entries &&
      "__typename" in schema.entries
    ) {
      let __typename = schema.entries.__typename as SupportedSchema
      while ("wrapped" in __typename)
        __typename = __typename.wrapped as SupportedSchema
      if (__typename.type === "literal") return __typename.literal as string
    }
  }

  public static isInteger(...schemas: PipedSchema[]): boolean {
    const pipe = ValibotMetadataCollector.getPipe(...schemas)
    return pipe.some((item) => item.type === "integer")
  }

  public static IDActionTypes: Set<string> = new Set(["cuid2", "ulid", "uuid"])

  public static isID(...schemas: PipedSchema[]): boolean {
    const pipe = ValibotMetadataCollector.getPipe(...schemas)
    return pipe.some((item) =>
      ValibotMetadataCollector.IDActionTypes.has(item.type)
    )
  }

  public static getPipe(...schemas: (PipedSchema | undefined)[]) {
    const pipe: (
      | PipeItemAsync<unknown, unknown, BaseIssue<unknown>>
      | PipeItem<unknown, unknown, BaseIssue<unknown>>
    )[] = []
    const pushToPipe = (schema: PipedSchema) => {
      pipe.push(schema)
      if ("pipe" in schema) {
        pipe.push(...schema.pipe)
      }
    }
    for (const schema of schemas) {
      if (schema == null) continue
      pushToPipe(schema)
      if ("wrapped" in schema) {
        pushToPipe(schema.wrapped as PipedSchema)
      }
    }
    return pipe
  }
}
export interface FieldConfig
  extends Partial<Omit<GraphQLFieldConfig<any, any>, "type">> {
  type?:
    | GraphQLOutputType
    | (() => GraphQLOutputType)
    | undefined
    | null
    | typeof SYMBOLS.FIELD_HIDDEN
}

/**
 * GraphQL field metadata type.
 */
export interface AsFieldMetadata<TInput> extends BaseMetadata<TInput> {
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
  readonly config: FieldConfig
}

/**
 * Creates a GraphQL field metadata.
 *
 * @param config - The GraphQL field config.
 *
 * @returns A GraphQL field metadata.
 */
export function asField<TInput>(config: FieldConfig): AsFieldMetadata<TInput> {
  return {
    kind: "metadata",
    type: "gqloom.asField",
    reference: asField,
    config,
  }
}

/**
 * GraphQL Object type metadata type.
 */
export interface AsObjectTypeMetadata<TInput extends object>
  extends BaseMetadata<TInput> {
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
  readonly config: Partial<
    Omit<GraphQLObjectTypeConfig<any, any>, "fields" | "interfaces">
  > & {
    interfaces?: (GenericSchema | GenericSchemaAsync | GraphQLInterfaceType)[]
  }
}

/**
 * Creates a GraphQL object type metadata.
 *
 * @param name - The GraphQL object name.
 *
 * @returns A GraphQL object type metadata.
 */
export function asObjectType<TInput extends object>(
  name: string
): AsObjectTypeMetadata<TInput>
/**
 * Creates a GraphQL object type metadata.
 *
 * @param config - The GraphQL object config.
 *
 * @returns A GraphQL object type metadata.
 */
export function asObjectType<TInput extends object>(
  config: AsObjectTypeMetadata<TInput>["config"]
): AsObjectTypeMetadata<TInput>

export function asObjectType<TInput extends object>(
  configOrName: AsObjectTypeMetadata<TInput>["config"] | string
): AsObjectTypeMetadata<TInput> {
  const config =
    typeof configOrName === "string" ? { name: configOrName } : configOrName
  return {
    kind: "metadata",
    type: "gqloom.asObjectType",
    reference: asObjectType,
    config,
  }
}

/**
 * GraphQL enum type metadata type.
 */
export interface AsEnumTypeMetadata<TInput extends string | number>
  extends BaseMetadata<TInput> {
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
  readonly config: EnumTypeConfig<TInput>
}

export interface EnumTypeConfig<TInput extends string | number>
  extends Partial<GraphQLEnumTypeConfig> {
  valuesConfig?: TInput extends string | number
    ? Partial<Record<TInput, GraphQLEnumValueConfig>>
    : Partial<Record<string, GraphQLEnumValueConfig>>
}

/**
 * Creates a GraphQL enum type metadata.
 *
 * @param name - The GraphQL enum name.
 *
 * @returns A GraphQL enum type metadata.
 */
export function asEnumType<TInput extends string | number>(
  name: string
): AsEnumTypeMetadata<TInput>
/**
 * Creates a GraphQL enum type metadata.
 *
 * @param config - The GraphQL enum config.
 *
 * @returns A GraphQL enum type metadata.
 */
export function asEnumType<TInput extends string | number>(
  config: EnumTypeConfig<TInput>
): AsEnumTypeMetadata<TInput>

export function asEnumType<TInput extends string | number>(
  configOrName: EnumTypeConfig<TInput> | string
): AsEnumTypeMetadata<TInput> {
  const config =
    typeof configOrName === "string" ? { name: configOrName } : configOrName
  return {
    kind: "metadata",
    type: "gqloom.asEnumType",
    reference: asEnumType,
    config,
  }
}

/**
 * GraphQL union type metadata type.
 */
export interface AsUnionTypeMetadata<TInput extends object>
  extends BaseMetadata<TInput> {
  /**
   * The metadata type.
   */
  readonly type: "gqloom.asUnionType"
  /**
   * The metadata reference.
   */
  readonly reference: typeof asUnionType

  /**
   * The GraphQL union type config.
   */
  readonly config: Partial<GraphQLUnionTypeConfig<any, any>>
}

/**
 * Creates a GraphQL union type metadata.
 *
 * @param config - The GraphQL union config.
 *
 * @returns A GraphQL union type metadata.
 */
export function asUnionType<TInput extends object>(
  config: AsUnionTypeMetadata<TInput>["config"]
): AsUnionTypeMetadata<TInput>
/**
 * Creates a GraphQL union type metadata.
 *
 * @param name - The GraphQL union type Name.
 *
 * @returns A GraphQL union type metadata.
 */
export function asUnionType<TInput extends object>(
  name: string
): AsUnionTypeMetadata<TInput>

export function asUnionType<TInput extends object>(
  configOrName: AsUnionTypeMetadata<TInput>["config"] | string
): AsUnionTypeMetadata<TInput> {
  const config =
    typeof configOrName === "string" ? { name: configOrName } : configOrName
  return {
    kind: "metadata",
    type: "gqloom.asUnionType",
    reference: asUnionType,
    config,
  }
}
