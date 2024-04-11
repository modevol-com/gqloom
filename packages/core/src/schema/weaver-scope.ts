import {
  type GraphQLInterfaceType,
  type GraphQLEnumType,
  type GraphQLInputObjectType,
  type GraphQLUnionType,
} from "graphql"
import { type ModifiableObjectType } from "./object"

export interface WeaverScope {
  objectMap: WeakMap<object, ModifiableObjectType>
  inputMap: WeakMap<object, GraphQLInputObjectType>
  enumMap: WeakMap<object, GraphQLEnumType>
  interfaceMap: WeakMap<object, GraphQLInterfaceType>
  unionMap: WeakMap<object, GraphQLUnionType>
}

let ref: WeaverScope | undefined

export const weaverScope: Partial<WeaverScope> = {
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

export function provideWeaverScope<T>(func: () => T, value?: WeaverScope): T {
  const lastRef = ref
  ref = value ?? {
    objectMap: new WeakMap(),
    inputMap: new WeakMap(),
    enumMap: new WeakMap(),
    interfaceMap: new WeakMap(),
    unionMap: new WeakMap(),
  }
  const result = func()
  ref = lastRef
  return result
}
