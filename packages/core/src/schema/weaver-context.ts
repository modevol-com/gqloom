import {
  type GraphQLInterfaceType,
  type GraphQLInputObjectType,
  type GraphQLObjectType,
  isEnumType,
  isObjectType,
  isUnionType,
  type GraphQLOutputType,
  type GraphQLUnionType,
  isScalarType,
} from "graphql"
import { type LoomObjectType } from "./object"
import { WEAVER_CONFIG } from "../utils/symbols"
import { SchemaVendorWeaver } from "./schema-weaver"

export interface WeaverContext {
  id: number
  loomObjectMap: Map<GraphQLObjectType, LoomObjectType>
  loomUnionMap: Map<GraphQLUnionType, GraphQLUnionType>
  inputMap: Map<
    GraphQLObjectType | GraphQLInterfaceType,
    GraphQLInputObjectType
  >
  interfaceMap: Map<GraphQLObjectType, GraphQLInterfaceType>
  configs: Map<string | symbol, WeaverConfig>
  getConfig: <TConfig extends WeaverConfig>(
    key: TConfig[typeof WEAVER_CONFIG]
  ) => TConfig | undefined
  setConfig<TConfig extends WeaverConfig>(config: TConfig): void
  deleteConfig: <TConfig extends WeaverConfig>(
    key: TConfig[typeof WEAVER_CONFIG]
  ) => void
  namedTypes: Map<string, GraphQLOutputType>
  memoNamedType<TGraphQLType extends GraphQLOutputType = GraphQLOutputType>(
    gqlType: TGraphQLType
  ): TGraphQLType
  getNamedType<T extends GraphQLOutputType>(name: string): T | undefined
  names: WeakMap<object, string>
  vendorWeavers: Map<string, typeof SchemaVendorWeaver>
}

let ref: WeaverContext | undefined

const names = new WeakMap<object, string>()

export interface WeaverConfig {
  [WEAVER_CONFIG]: string | symbol
  vendorWeaver?: typeof SchemaVendorWeaver
}

export function initWeaverContext(): WeaverContext {
  return {
    id: initWeaverContext.increasingID++,
    loomObjectMap: new Map(),
    loomUnionMap: new Map(),
    inputMap: new Map(),
    interfaceMap: new Map(),
    configs: new Map(),
    getConfig<TConfig extends WeaverConfig>(
      key: TConfig[typeof WEAVER_CONFIG]
    ) {
      return this.configs.get(key) as TConfig | undefined
    },
    setConfig(config) {
      const key = config[WEAVER_CONFIG]
      this.configs.set(key, config)
    },
    deleteConfig(key) {
      this.configs.delete(key)
    },
    names,
    namedTypes: new Map<string, GraphQLOutputType>(),
    memoNamedType(gqlTypeValue) {
      const gqlType = gqlTypeValue as GraphQLOutputType
      if (
        isObjectType(gqlType) ||
        isUnionType(gqlType) ||
        isEnumType(gqlType) ||
        isScalarType(gqlType)
      ) {
        this.namedTypes.set(gqlType.name, gqlType)
      }
      return gqlTypeValue
    },
    getNamedType<T extends GraphQLOutputType>(name: string) {
      return this.namedTypes.get(name) as T | undefined
    },
    vendorWeavers: new Map(),
  }
}

initWeaverContext.increasingID = 1

type GlobalContextRequiredKeys =
  | "names"
  | "getConfig"
  | "setConfig"
  | "getNamedType"
  | "memoNamedType"

export interface GlobalWeaverContext
  extends Partial<Omit<WeaverContext, GlobalContextRequiredKeys>>,
    Pick<WeaverContext, GlobalContextRequiredKeys> {
  value?: WeaverContext
  useConfig<TConfig extends WeaverConfig, TCallback extends () => any>(
    config: TConfig,
    callback: TCallback
  ): ReturnType<TCallback>

  GraphQLTypes: WeakMap<object, GraphQLOutputType>
  getGraphQLType<TGraphQLType extends GraphQLOutputType = GraphQLOutputType>(
    origin: object
  ): TGraphQLType | undefined
  memoGraphQLType<TGraphQLType extends GraphQLOutputType = GraphQLOutputType>(
    origin: object,
    gqlType: TGraphQLType
  ): TGraphQLType
}

export const weaverContext: GlobalWeaverContext = {
  get id() {
    return ref?.id
  },
  get loomObjectMap() {
    return ref?.loomObjectMap
  },
  get loomUnionMap() {
    return ref?.loomUnionMap
  },
  get inputMap() {
    return ref?.inputMap
  },
  get interfaceMap() {
    return ref?.interfaceMap
  },

  get configs() {
    return ref?.configs
  },

  get vendorWeavers() {
    return ref?.vendorWeavers
  },

  getConfig(key) {
    return ref?.getConfig(key)
  },
  setConfig(config) {
    ref?.setConfig(config)
  },
  deleteConfig(key) {
    ref?.deleteConfig(key)
  },
  get value() {
    return ref
  },
  useConfig<TConfig extends WeaverConfig, TCallback extends () => any>(
    config: TConfig,
    callback: TCallback
  ) {
    const context = weaverContext.value ?? initWeaverContext()
    context.setConfig(config)

    const result = provideWeaverContext(callback, context)

    context.deleteConfig(config[WEAVER_CONFIG])
    return result
  },
  names,

  getNamedType(name) {
    return ref?.getNamedType(name)
  },
  memoNamedType(gqlType) {
    return ref?.memoNamedType(gqlType) ?? gqlType
  },

  GraphQLTypes: new WeakMap(),

  getGraphQLType<TGraphQLType extends GraphQLOutputType = GraphQLOutputType>(
    origin: object
  ): TGraphQLType | undefined {
    return this.GraphQLTypes.get(origin) as TGraphQLType | undefined
  },

  memoGraphQLType<TGraphQLType extends GraphQLOutputType = GraphQLOutputType>(
    origin: object,
    gqlType: TGraphQLType
  ) {
    this.GraphQLTypes.set(origin, gqlType)
    return gqlType
  },
}

export function provideWeaverContext<T>(
  func: () => T,
  value: WeaverContext | undefined
): T {
  const lastRef = ref
  ref = value
  try {
    return func()
  } finally {
    ref = lastRef
  }
}

provideWeaverContext.inherit = <T>(func: () => T) => {
  const weaverContextRef = weaverContext.value
  return () => provideWeaverContext(func, weaverContextRef)
}

/**
 * collect names for schemas
 * @param namesList - names to collect
 * @returns namesRecord
 */
export function collectNames<TRecords extends Record<string, object>[]>(
  ...namesList: TRecords
): UnionToIntersection<TRecords[number]> {
  const namesRecord = {} as any
  for (const namesItem of namesList) {
    for (const [name, schema] of Object.entries(namesItem)) {
      names.set(schema, name)
      namesRecord[name] = schema
    }
  }
  return namesRecord
}

/**
 * collect name for schema
 * @param name - name for
 * @param schema - schema to be named
 * @returns schema
 */
export function collectName<TSchema extends object>(
  name: string,
  schema: TSchema
): TSchema {
  names.set(schema, name)
  return schema
}

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never
