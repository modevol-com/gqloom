import {
  type GraphQLInputObjectType,
  type GraphQLInterfaceType,
  type GraphQLNamedType,
  type GraphQLObjectType,
  type GraphQLOutputType,
  type GraphQLUnionType,
  isEnumType,
  isObjectType,
  isScalarType,
  isUnionType,
} from "graphql"
import { WEAVER_CONFIG } from "../utils/symbols"
import type { LoomObjectType } from "./object"
import type { SchemaWeaver } from "./schema-weaver"

export class WeaverContext {
  public static increasingID = 1
  public static names = new WeakMap<object, string>()
  public static autoAliasTypes = new WeakSet<GraphQLNamedType>()
  private static _ref: WeaverContext | undefined

  public static get ref(): WeaverContext | undefined {
    return WeaverContext._ref
  }

  public id: number
  public loomObjectMap: Map<GraphQLObjectType, LoomObjectType>
  public loomUnionMap: Map<GraphQLUnionType, GraphQLUnionType>
  public inputMap: Map<
    GraphQLObjectType | GraphQLInterfaceType,
    GraphQLInputObjectType
  >
  public interfaceMap: Map<GraphQLObjectType, GraphQLInterfaceType>
  public configs: Map<string | symbol, WeaverConfig>
  public namedTypes: Map<string, GraphQLOutputType>
  public vendorWeavers: Map<string, SchemaWeaver>

  public constructor() {
    this.id = WeaverContext.increasingID++
    this.loomObjectMap = new Map()
    this.loomUnionMap = new Map()
    this.inputMap = new Map()
    this.interfaceMap = new Map()
    this.configs = new Map()
    this.namedTypes = new Map<string, GraphQLOutputType>()
    this.vendorWeavers = new Map()
  }

  public getConfig<TConfig extends WeaverConfig>(
    key: TConfig[typeof WEAVER_CONFIG]
  ): TConfig | undefined {
    return this.configs.get(key) as TConfig | undefined
  }

  public setConfig<TConfig extends WeaverConfig>(config: TConfig): void {
    const key = config[WEAVER_CONFIG]
    this.configs.set(key, config)
  }

  public deleteConfig<TConfig extends WeaverConfig>(
    key: TConfig[typeof WEAVER_CONFIG]
  ): void {
    this.configs.delete(key)
  }

  public memoNamedType<
    TGraphQLType extends GraphQLOutputType = GraphQLOutputType,
  >(gqlTypeValue: TGraphQLType): TGraphQLType {
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
  }

  public getNamedType<T extends GraphQLOutputType>(
    name: string
  ): T | undefined {
    return this.namedTypes.get(name) as T | undefined
  }

  public static provide<T>(func: () => T, value: WeaverContext | undefined): T {
    const lastRef = WeaverContext._ref
    WeaverContext._ref = value
    try {
      return func()
    } finally {
      WeaverContext._ref = lastRef
    }
  }
}

export const initWeaverContext = (): WeaverContext => new WeaverContext()

export const provideWeaverContext = Object.assign(WeaverContext.provide, {
  inherit: <T>(func: () => T) => {
    const weaverContextRef = WeaverContext.ref
    return () => WeaverContext.provide(func, weaverContextRef)
  },
})

export interface WeaverConfig {
  [WEAVER_CONFIG]: string | symbol
  vendorWeaver?: SchemaWeaver
}

type GlobalContextRequiredKeys =
  | "getConfig"
  | "setConfig"
  | "deleteConfig"
  | "getNamedType"
  | "memoNamedType"

export class GlobalWeaverContext
  implements
    Partial<Omit<WeaverContext, GlobalContextRequiredKeys>>,
    Pick<WeaverContext, GlobalContextRequiredKeys>
{
  public GraphQLTypes = new WeakMap<object, GraphQLOutputType>()

  public get id() {
    return WeaverContext.ref?.id
  }
  public get loomObjectMap() {
    return WeaverContext.ref?.loomObjectMap
  }
  public get loomUnionMap() {
    return WeaverContext.ref?.loomUnionMap
  }
  public get inputMap() {
    return WeaverContext.ref?.inputMap
  }
  public get interfaceMap() {
    return WeaverContext.ref?.interfaceMap
  }
  public get configs() {
    return WeaverContext.ref?.configs
  }
  public get vendorWeavers() {
    return WeaverContext.ref?.vendorWeavers
  }
  public get names() {
    return WeaverContext.names
  }
  public get autoAliasTypes() {
    return WeaverContext.autoAliasTypes
  }
  public get value() {
    return WeaverContext.ref
  }

  public getConfig<TConfig extends WeaverConfig>(
    key: TConfig[typeof WEAVER_CONFIG]
  ): TConfig | undefined {
    return WeaverContext.ref?.getConfig(key)
  }
  public setConfig(config: WeaverConfig): void {
    WeaverContext.ref?.setConfig(config)
  }
  public deleteConfig(key: string | symbol): void {
    WeaverContext.ref?.deleteConfig(key)
  }
  public useConfig<TConfig extends WeaverConfig, TCallback extends () => any>(
    config: TConfig,
    callback: TCallback
  ): ReturnType<TCallback> {
    const context = this.value ?? initWeaverContext()
    context.setConfig(config)

    const result = provideWeaverContext(callback, context)

    context.deleteConfig(config[WEAVER_CONFIG])
    return result
  }

  public getNamedType<T extends GraphQLOutputType>(
    name: string
  ): T | undefined {
    return WeaverContext.ref?.getNamedType(name) as T | undefined
  }
  public memoNamedType<
    TGraphQLType extends GraphQLOutputType = GraphQLOutputType,
  >(gqlType: TGraphQLType): TGraphQLType {
    return WeaverContext.ref?.memoNamedType(gqlType) ?? gqlType
  }

  public getGraphQLType<
    TGraphQLType extends GraphQLOutputType = GraphQLOutputType,
  >(origin: object): TGraphQLType | undefined {
    return this.GraphQLTypes.get(origin) as TGraphQLType | undefined
  }
  public memoGraphQLType<
    TGraphQLType extends GraphQLOutputType = GraphQLOutputType,
  >(origin: object, gqlType: TGraphQLType) {
    this.GraphQLTypes.set(origin, gqlType)
    return gqlType
  }
}

export const weaverContext = new GlobalWeaverContext()

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
      WeaverContext.names.set(schema, name)
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
  WeaverContext.names.set(schema, name)
  return schema
}

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never
