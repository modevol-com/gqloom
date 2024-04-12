import {
  type GraphQLInterfaceType,
  type GraphQLEnumType,
  type GraphQLInputObjectType,
  type GraphQLUnionType,
  type GraphQLObjectType,
} from "graphql"
import { type ModifiableObjectType } from "./object"

export interface WeaverScope {
  modifiableObjectMap: Map<any, ModifiableObjectType>
  objectMap: Map<any, GraphQLObjectType>
  inputMap: Map<any, GraphQLInputObjectType>
  enumMap: Map<any, GraphQLEnumType>
  interfaceMap: Map<any, GraphQLInterfaceType>
  unionMap: Map<any, GraphQLUnionType>
}

let ref: WeaverScope | undefined

export function initScope(): WeaverScope {
  return {
    modifiableObjectMap: new Map(),
    objectMap: new Map(),
    inputMap: new Map(),
    enumMap: new Map(),
    interfaceMap: new Map(),
    unionMap: new Map(),
  }
}

export const weaverScope: Partial<WeaverScope> = {
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
}

export function provideWeaverScope<T>(
  func: () => T,
  value: WeaverScope | undefined
): T {
  const lastRef = ref
  ref = value
  const result = func()
  ref = lastRef
  return result
}
