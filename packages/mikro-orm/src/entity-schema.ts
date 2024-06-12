import {
  type InferSilkO,
  type GraphQLSilk,
  type InferSilkI,
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
} from "@mikro-orm/core"
import { GraphQLObjectType } from "graphql"

export function defineEntitySchema<TSilk extends GraphQLSilk<object, any>>(
  silk: TSilk
): EntitySchema<InferSilkO<TSilk>>
export function defineEntitySchema<
  TSilk extends GraphQLSilk<any, any>,
  TRelationships extends Record<
    string,
    RelationshipProperty<any, InferSilkO<TSilk>>
  >,
>(
  silk: TSilk,
  relationships: TRelationships
): SilkEntitySchema<TSilk, TRelationships>
export function defineEntitySchema(
  silk: GraphQLSilk<any, any>,
  relationships?: Record<string, RelationshipProperty<any, object>>
): EntitySchema {
  const gqlType = silk.getGraphQLType()
  if (!(gqlType instanceof GraphQLObjectType))
    throw new Error("Only object type can be converted to entity schema")

  return new EntitySchema({
    name: gqlType.name,
  })
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
