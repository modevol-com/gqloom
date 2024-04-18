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
  memo(gqlType: GraphQLOutputType): void
}

let ref: WeaverContext | undefined

export function initWeaverContext(): WeaverContext {
  return {
    loomObjectMap: new Map(),
    objectMap: new Map(),
    inputMap: new Map(),
    enumMap: new Map(),
    interfaceMap: new Map(),
    unionMap: new Map(),
    options: {},
    memo(gqlType) {
      if (isObjectType(gqlType)) {
        weaverContext.objectMap?.set(gqlType.name, gqlType)
      } else if (isUnionType(gqlType)) {
        weaverContext.unionMap?.set(gqlType.name, gqlType)
      } else if (isEnumType(gqlType)) {
        weaverContext.enumMap?.set(gqlType.name, gqlType)
      }
    },
  }
}

export const weaverContext: Partial<
  Omit<WeaverContext, "memo"> & { value: WeaverContext }
> &
  Pick<WeaverContext, "memo"> = {
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
  memo(gqlType: GraphQLOutputType) {
    return ref?.memo(gqlType)
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
