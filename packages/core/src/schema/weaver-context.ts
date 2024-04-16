import {
  type GraphQLInterfaceType,
  type GraphQLEnumType,
  type GraphQLInputObjectType,
  type GraphQLUnionType,
  type GraphQLObjectType,
} from "graphql"
import { type LoomObjectType } from "./object"

export interface WeaverContext {
  modifiableObjectMap: Map<GraphQLObjectType, LoomObjectType>
  objectMap: Map<any, GraphQLObjectType>
  inputMap: Map<any, GraphQLInputObjectType>
  enumMap: Map<any, GraphQLEnumType>
  interfaceMap: Map<any, GraphQLInterfaceType>
  unionMap: Map<any, GraphQLUnionType>
  options: Record<string | symbol | number, any>
}

let ref: WeaverContext | undefined

export function initWeaverContext(): WeaverContext {
  return {
    modifiableObjectMap: new Map(),
    objectMap: new Map(),
    inputMap: new Map(),
    enumMap: new Map(),
    interfaceMap: new Map(),
    unionMap: new Map(),
    options: {},
  }
}

export const weaverContext: Partial<WeaverContext> = {
  get modifiableObjectMap() {
    return ref?.modifiableObjectMap
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
