import {
  type InferSilkO,
  type GraphQLSilk,
  type InferSilkI,
  mapValue,
  notNullish,
  getGraphQLType,
  SYMBOLS,
} from "@gqloom/core"
import {
  EntitySchema,
  type ManyToOneOptions,
  ReferenceKind,
  type EntitySchemaProperty,
  type OneToManyOptions,
  type OneToOneOptions,
  type ManyToManyOptions,
  type Ref,
  type Collection,
  type OptionalProps,
  type EntityName,
  type EntitySchemaMetadata,
  type EntityProperty,
  type EventArgs,
} from "@mikro-orm/core"
import {
  GraphQLObjectType,
  type GraphQLOutputType,
  GraphQLNonNull,
  GraphQLList,
  GraphQLString,
  GraphQLFloat,
  GraphQLInt,
  GraphQLBoolean,
  GraphQLID,
  GraphQLScalarType,
} from "graphql"
import { type GqloomMikroFieldExtensions } from "./types"

export function defineEntitySchema<TSilk extends GraphQLSilk<object, any>>(
  silk: TSilk,
  options?: EntitySchemaMetadata<SilkEntity<TSilk>> & EntitySchemaWeaverOptions
): EntitySchema<SilkEntity<TSilk>>
export function defineEntitySchema<
  TSilk extends GraphQLSilk<any, any>,
  TRelationships extends Record<
    string,
    RelationshipProperty<any, InferSilkO<TSilk>>
  >,
>(
  silk: TSilk,
  relationships: TRelationships,
  options?: EntitySchemaMetadata<SilkEntity<TSilk>> & EntitySchemaWeaverOptions
): SilkEntitySchema<TSilk, TRelationships>
export function defineEntitySchema(
  silk: GraphQLSilk<any, any>,
  relationshipsOrOptions?:
    | Record<string, RelationshipProperty<any, object>>
    | EntitySchemaMetadata<any>,
  options?: EntitySchemaMetadata<any> & EntitySchemaWeaverOptions
): EntitySchema {
  const gqlType = getGraphQLType(silk)
  if (!(gqlType instanceof GraphQLObjectType))
    throw new Error("Only object type can be converted to entity schema")

  let relationships: Record<string, RelationshipProperty<any, object>> = {}

  if (isRelationshipProperties(relationshipsOrOptions)) {
    relationships = relationshipsOrOptions
  } else {
    options = relationshipsOrOptions
  }

  return new EntitySchema({
    name: gqlType.name,
    properties: {
      ...toProperties(gqlType, options),
      ...relationships,
    },
    ...options,
    hooks: {
      ...options?.hooks,
      onInit: [
        ({ entity }: EventArgs<any>) => {
          if (silk[SYMBOLS.PARSE] == null) return
          const pureEntity = Object.fromEntries(
            Object.entries(entity).filter(([, value]) => value !== undefined)
          )
          const parsed = silk[SYMBOLS.PARSE](pureEntity)
          if (parsed !== undefined) {
            Object.assign(entity, parsed)
          }
        },
        ...(Array.isArray(options?.hooks?.onInit)
          ? options.hooks.onInit
          : [options?.hooks?.onInit].filter(notNullish)),
      ],
    },
  })
}

type TypeProperty = Exclude<
  EntitySchemaProperty<any, any>,
  | {
      kind:
        | ReferenceKind.MANY_TO_ONE
        | "m:1"
        | ReferenceKind.ONE_TO_ONE
        | "1:1"
        | ReferenceKind.ONE_TO_MANY
        | "1:m"
        | ReferenceKind.MANY_TO_MANY
        | "m:n"
        | ReferenceKind.EMBEDDED
        | "embedded"
    }
  | { enum: true }
  | { entity: string | (() => EntityName<any>) }
>

function toProperties(
  gqlType: GraphQLObjectType,
  options?: EntitySchemaWeaverOptions
): Record<string, EntitySchemaProperty<any, any>> {
  return mapValue(gqlType.getFields(), (field) => {
    const extensions = field.extensions as GqloomMikroFieldExtensions
    return {
      ...toTypeProperty(field.type, {
        ...(extensions.mikroProperty as TypeProperty),
        ...options,
      }),
      ...extensions.mikroProperty,
    } as EntitySchemaProperty<any, any>
  })
}

function getGraphQLScalarType(
  gqlType: GraphQLScalarType<any, any>
): EntityProperty["type"] {
  switch (gqlType) {
    case GraphQLString:
      return "string"
    case GraphQLFloat:
      return "float"
    case GraphQLInt:
      return "integer"
    case GraphQLBoolean:
      return "boolean"
    case GraphQLID:
      return "string"
    default:
      return "string"
  }
}

export interface EntitySchemaWeaverOptions {
  getPropertyType?: (
    gqlType: Exclude<GraphQLOutputType, GraphQLNonNull<any> | GraphQLList<any>>,
    wrappedType: GraphQLOutputType
  ) => string
}

function toTypeProperty(
  wrappedType: GraphQLOutputType,
  options?: Partial<TypeProperty> & EntitySchemaWeaverOptions
): TypeProperty {
  let nullable = true
  let isList = false
  let type = options?.type
  const gqlType = unwrap(wrappedType)
  type ??= options?.getPropertyType?.(gqlType, wrappedType)

  if (type == null) {
    let simpleType: EntityProperty["type"]
    if (gqlType instanceof GraphQLScalarType) {
      simpleType = getGraphQLScalarType(gqlType)
    } else if (gqlType instanceof GraphQLObjectType) {
      simpleType = "json"
    } else {
      simpleType = "string"
    }
    type = isList ? `${simpleType}[]` : simpleType
  }
  return {
    type,
    nullable,
    ...options,
  }

  function unwrap(t: GraphQLOutputType) {
    if (t instanceof GraphQLNonNull) {
      nullable = false
      return unwrap(t.ofType)
    }
    if (t instanceof GraphQLList) {
      isList = true
      return unwrap(t.ofType)
    }
    return t
  }
}

function isRelationshipProperties(
  relationshipsOrOptions:
    | Record<string, RelationshipProperty<any, object>>
    | EntitySchemaMetadata<any>
    | undefined
): relationshipsOrOptions is Record<string, RelationshipProperty<any, object>> {
  if (relationshipsOrOptions === undefined) return false
  const firstValue = Object.values(relationshipsOrOptions)[0]
  if ("kind" in firstValue) {
    if (Object.values(ReferenceKind).includes(firstValue["kind"])) return true
  }
  return false
}

export type SilkEntity<TSilk extends GraphQLSilk<any, any>> =
  InferSilkO<TSilk> & {
    [OptionalProps]: DiffKeys<
      NonNullishKeys<InferSilkO<TSilk>>,
      NonNullishKeys<InferSilkI<TSilk>>
    >
  }

export type SilkEntitySchema<
  TSilk extends GraphQLSilk<any, any>,
  TRelationships extends Record<
    string,
    RelationshipProperty<any, InferSilkO<TSilk>>
  > = never,
> = EntitySchema<SilkEntity<TSilk> & InferRelationship<TRelationships>>

export type InferRelationship<
  TRelationships extends Record<string, RelationshipProperty<any, any>>,
> = {
  [key in keyof TRelationships]: TRelationships[key] extends ManyToOneProperty<
    infer TTarget,
    any
  >
    ? Ref<TTarget>
    : TRelationships[key] extends OneToOneProperty<infer TTarget, any>
      ? Ref<TTarget>
      : TRelationships[key] extends OneToManyProperty<infer TTarget, any>
        ? TTarget extends object
          ? Collection<TTarget>
          : never
        : TRelationships[key] extends ManyToManyProperty<infer TTarget, any>
          ? TTarget extends object
            ? Collection<TTarget>
            : never
          : never
}

export type RelationshipProperty<TTarget extends object, TOwner> =
  | ManyToOneProperty<TTarget, TOwner>
  | OneToOneProperty<TTarget, TOwner>
  | OneToManyProperty<TTarget, TOwner>
  | ManyToManyProperty<TTarget, TOwner>

export type ManyToOneProperty<TTarget extends object, TOwner> = Extract<
  EntitySchemaProperty<TTarget, TOwner>,
  { kind: ReferenceKind.MANY_TO_ONE | "m:1" }
>

export function manyToOne<TTarget extends object, TOwner>(
  entity: string | (() => string | EntityName<TTarget>),
  options?: ManyToOneOptions<TOwner, TTarget>
): ManyToOneProperty<TTarget, TOwner> {
  return {
    kind: ReferenceKind.MANY_TO_ONE,
    entity,
    ref: true,
    ...options,
  }
}

export type OneToManyProperty<TTarget extends object, TOwner> = Extract<
  EntitySchemaProperty<TTarget, TOwner>,
  { kind: ReferenceKind.ONE_TO_MANY | "1:m" }
>

export function oneToMany<TTarget extends object, TOwner>(
  entity: string | (() => string | EntityName<TTarget>),
  options: OneToManyOptions<TOwner, TTarget>
): OneToManyProperty<TTarget, TOwner> {
  return {
    kind: ReferenceKind.ONE_TO_MANY,
    entity,
    ...options,
  }
}

export type OneToOneProperty<TTarget extends object, TOwner> = Extract<
  EntitySchemaProperty<TTarget, TOwner>,
  { kind: ReferenceKind.ONE_TO_ONE | "1:1" }
>

export function oneToOne<TTarget extends object, TOwner>(
  entity: string | (() => string | EntityName<TTarget>),
  options?: OneToOneOptions<TOwner, TTarget>
): OneToOneProperty<TTarget, TOwner> {
  return {
    kind: ReferenceKind.ONE_TO_ONE,
    entity,
    ...options,
  }
}

export type ManyToManyProperty<TTarget extends object, TOwner> = Extract<
  EntitySchemaProperty<TTarget, TOwner>,
  { kind: ReferenceKind.MANY_TO_MANY | "m:n" }
>

export function manyToMany<TTarget extends object, TOwner>(
  entity: string | (() => string | EntityName<TTarget>),
  options?: ManyToManyOptions<TOwner, TTarget>
): ManyToManyProperty<TTarget, TOwner> {
  return {
    kind: ReferenceKind.MANY_TO_MANY,
    entity,
    ...options,
  }
}

type NonNullishKeys<T extends Record<string, any>> = NonNullable<
  {
    [K in keyof T]: undefined extends T[K]
      ? never
      : null extends T[K]
        ? never
        : K
  }[keyof T]
>

type DiffKeys<
  T extends string | number | symbol,
  U extends string | number | symbol,
> = ({ [P in T]: P } & {
  [P in U]: never
} & {
  [x: string]: never
})[T]
