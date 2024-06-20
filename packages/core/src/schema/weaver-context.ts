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
  options: Record<string | symbol | number, any>
  memo<T extends GraphQLOutputType>(gqlType: T): T
  names: WeakMap<object, string>
}

let ref: WeaverContext | undefined

const names = new WeakMap<object, string>()

export function initWeaverContext(): WeaverContext {
  return {
    loomObjectMap: new Map(),
    objectMap: new Map(),
    inputMap: new Map(),
    enumMap: new Map(),
    interfaceMap: new Map(),
    unionMap: new Map(),
    options: {},
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

export const weaverContext: Partial<
  Omit<WeaverContext, "memo" | "names"> & { value: WeaverContext }
> &
  Pick<WeaverContext, "memo" | "names"> = {
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
  get options() {
    return ref?.options
  },
  get value() {
    return ref
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
      namesRecord[name] = schema as any
    }
  }
  return namesRecord
}

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never
