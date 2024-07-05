import {
  type GraphQLInterfaceType,
  type GraphQLEnumType,
  type GraphQLInputObjectType,
  type GraphQLUnionType,
  type GraphQLObjectType,
  isEnumType,
  isObjectType,
  isUnionType,
  type GraphQLOutputType,
} from "graphql"
import { type LoomObjectType } from "./object"
import { WEAVER_CONFIG } from "../utils/symbols"

export interface WeaverContext {
  loomObjectMap: Map<GraphQLObjectType, LoomObjectType>
  objectMap: Map<string, GraphQLObjectType>
  inputMap: Map<
    GraphQLObjectType | GraphQLInterfaceType,
    GraphQLInputObjectType
  >
  interfaceMap: Map<GraphQLObjectType, GraphQLInterfaceType>
  enumMap: Map<string, GraphQLEnumType>
  unionMap: Map<string, GraphQLUnionType>
  configs: Map<string | symbol, WeaverConfig>
  getConfig: <TConfig extends WeaverConfig>(
    key: TConfig[typeof WEAVER_CONFIG]
  ) => TConfig | undefined
  setConfig<TConfig extends WeaverConfig>(config: TConfig): void
  deleteConfig: <TConfig extends WeaverConfig>(
    key: TConfig[typeof WEAVER_CONFIG]
  ) => void
  memo<T extends GraphQLOutputType>(gqlType: T): T
  names: WeakMap<object, string>
}

let ref: WeaverContext | undefined

const names = new WeakMap<object, string>()

export interface WeaverConfig {
  [WEAVER_CONFIG]: string | symbol
}

export function initWeaverContext(): WeaverContext {
  return {
    loomObjectMap: new Map(),
    objectMap: new Map(),
    inputMap: new Map(),
    enumMap: new Map(),
    interfaceMap: new Map(),
    unionMap: new Map(),
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
    memo(gqlType) {
      if (isObjectType(gqlType)) {
        weaverContext.objectMap?.set(gqlType.name, gqlType)
      } else if (isUnionType(gqlType)) {
        weaverContext.unionMap?.set(gqlType.name, gqlType)
      } else if (isEnumType(gqlType)) {
        weaverContext.enumMap?.set(gqlType.name, gqlType)
      }
      return gqlType
    },
  }
}

export interface GlobalWeaverContext
  extends Partial<
      Omit<WeaverContext, "memo" | "names" | "getConfig" | "setConfig">
    >,
    Pick<WeaverContext, "memo" | "names" | "getConfig" | "setConfig"> {
  value?: WeaverContext
  useConfig<TConfig extends WeaverConfig, TCallback extends () => any>(
    config: TConfig,
    callback: TCallback
  ): ReturnType<TCallback>
}

export const weaverContext: GlobalWeaverContext = {
  get loomObjectMap() {
    return ref?.loomObjectMap
  },
  get objectMap() {
    return ref?.objectMap
  },
  get inputMap() {
    return ref?.inputMap
  },
  get enumMap() {
    return ref?.enumMap
  },
  get interfaceMap() {
    return ref?.interfaceMap
  },
  get unionMap() {
    return ref?.unionMap
  },

  get configs() {
    return ref?.configs
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
  memo(gqlType) {
    return ref?.memo(gqlType) ?? gqlType
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

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never
