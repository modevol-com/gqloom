import {
  type GQLoomExtensions,
  type GraphQLSilk,
  type StandardSchemaV1,
  type WeaverContext,
  getGraphQLType,
  mapValue,
  notNullish,
  provideWeaverContext,
  weaverContext,
} from "@gqloom/core"
import {
  type Collection,
  type EntityName,
  type EntityProperty,
  EntitySchema,
  type EntitySchemaMetadata,
  type EntitySchemaProperty,
  type EventArgs,
  type ManyToManyOptions,
  type ManyToOneOptions,
  type OneToManyOptions,
  type OneToOneOptions,
  type OptionalProps,
  type Reference,
  ReferenceKind,
} from "@mikro-orm/core"
import {
  GraphQLBoolean,
  type GraphQLField,
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  type GraphQLObjectTypeConfig,
  type GraphQLOutputType,
  GraphQLScalarType,
  GraphQLString,
} from "graphql"
import { type EntitySchemaSilk, mikroSilk } from "."
import type { GQLoomMikroFieldExtensions } from "./types"
import { EntityGraphQLTypes, unwrapGraphQLType } from "./utils"

/**
 * @deprecated use `defineEntity` and `mikroSilk` instead.
 */
export class EntitySchemaWeaver {
  public static weave(
    silk: GraphQLSilk<any, any>,
    relations?: Record<string, RelationProperty<any, object>>,
    options?: Partial<EntitySchemaMetadata<any>> & EntitySchemaWeaverOptions
  ): EntitySchemaSilk<any> {
    const gqlType = unwrapGraphQLType(
      getGraphQLTypeWithName(silk, options?.name, options?.weaverContext)
    )
    if (!(gqlType instanceof GraphQLObjectType))
      throw new Error(
        `Only object type can be converted to entity schema, but got ${gqlType}`
      )

    const entity = new EntitySchema({
      name: gqlType.name,
      properties: {
        ...EntitySchemaWeaver.toProperties(gqlType, options),
        ...relations,
      },
      ...options,
      hooks: {
        ...options?.hooks,
        onInit: [
          ({ entity }: EventArgs<any>) => {
            const fields = gqlType.getFields()

            const values = mapValue(fields, (field, key) => {
              if (key in entity && entity[key] !== undefined)
                return mapValue.SKIP
              if (field.extensions.defaultValue === undefined)
                return mapValue.SKIP

              if (typeof field.extensions.defaultValue === "function")
                return field.extensions.defaultValue()
              return field.extensions.defaultValue
            })

            Object.assign(entity, values)
          },
          ...(Array.isArray(options?.hooks?.onInit)
            ? options.hooks.onInit
            : [options?.hooks?.onInit].filter(notNullish)),
        ],
      },
    })

    EntityGraphQLTypes.set(entity.meta, gqlType)

    return mikroSilk(entity, options?.asObjectType)
  }

  public static toProperties(
    gqlType: GraphQLObjectType,
    options?: EntitySchemaWeaverOptions
  ): Record<string, EntitySchemaProperty<any, any>> {
    return mapValue(gqlType.getFields(), (field) => {
      const extensions = field.extensions as GQLoomMikroFieldExtensions &
        GQLoomExtensions

      const typeOptions =
        extensions.mikroProperty?.type == null
          ? EntitySchemaWeaver.getPropertyType(field.type, field, options)
          : undefined

      const commentOptions = field.description
        ? { comment: field.description }
        : undefined

      return {
        ...typeOptions,
        ...commentOptions,
        ...extensions.mikroProperty,
      } as EntitySchemaProperty<any, any>
    })
  }

  public static getPropertyType(
    wrappedType: GraphQLOutputType,
    field: GraphQLField<any, any, any>,
    options?: EntitySchemaWeaverOptions
  ): PropertyType {
    let nullable = true
    let isList = false
    const gqlType = unwrap(wrappedType)

    const typeOrProperty:
      | EntityProperty["type"]
      | Partial<PropertyType>
      | undefined = options?.getProperty?.(gqlType, field)

    const property: Partial<PropertyType> =
      typeof typeOrProperty === "string"
        ? { type: typeOrProperty }
        : (typeOrProperty ?? {})

    const extensions = field.extensions as GQLoomMikroFieldExtensions &
      GQLoomExtensions
    if (extensions.defaultValue !== undefined) nullable = false

    return {
      nullable,
      ...property,
      type:
        property.type ??
        (() => {
          let simpleType: EntityProperty["type"]
          if (gqlType instanceof GraphQLScalarType) {
            simpleType = EntitySchemaWeaver.getGraphQLScalarType(gqlType)
          } else if (gqlType instanceof GraphQLObjectType) {
            simpleType = "json"
          } else {
            simpleType = "string"
          }
          const type: EntityProperty["type"] = isList
            ? `${simpleType}[]`
            : simpleType
          return type
        })(),
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

  public static getGraphQLScalarType(
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

  public static createWeaver(
    toSilk: (schema: StandardSchemaV1) => GraphQLSilk,
    creatorOptions: EntitySchemaWeaverOptions = {}
  ): CallableEntitySchemaWeaver {
    return Object.assign(
      (
        silk: StandardSchemaV1,
        options?: Partial<EntitySchemaMetadata<any>> & EntitySchemaWeaverOptions
      ) =>
        EntitySchemaWeaver.weave(toSilk(silk), undefined, {
          ...creatorOptions,
          ...options,
        } as EntitySchemaMetadata<any> & EntitySchemaWeaverOptions),
      {
        withRelations: (
          silk: StandardSchemaV1,
          relations: Record<string, RelationProperty<any, any>>,
          options?: Partial<EntitySchemaMetadata<any>> &
            EntitySchemaWeaverOptions
        ) =>
          EntitySchemaWeaver.weave(toSilk(silk), relations, {
            ...creatorOptions,
            ...options,
          } as EntitySchemaMetadata<any> & EntitySchemaWeaverOptions),
      }
    )
  }
}

function getGraphQLTypeWithName(
  silk: GraphQLSilk<any, any>,
  name?: string | null,
  context?: WeaverContext
) {
  const lastName = weaverContext.names.get(silk)
  try {
    if (name != null) weaverContext.names.set(silk, name)

    if (!context) return getGraphQLType(silk)
    return provideWeaverContext(() => getGraphQLType(silk), context)
  } finally {
    if (lastName === undefined) {
      weaverContext.names.delete(silk)
    } else {
      weaverContext.names.set(silk, lastName)
    }
  }
}

/**
 * @deprecated use `defineEntity` and `mikroSilk` instead.
 */
export interface CallableEntitySchemaWeaver {
  <TSilk extends GraphQLSilk>(
    silk: TSilk,
    options?: Partial<EntitySchemaMetadata<SilkSchemaEntity<TSilk>>> &
      EntitySchemaWeaverOptions
  ): EntitySilk<SilkSchemaEntity<TSilk>>

  withRelations: <
    TSilk extends GraphQLSilk,
    TRelations extends Record<
      string,
      RelationProperty<any, StandardSchemaV1.InferOutput<TSilk>>
    > = never,
  >(
    silk: TSilk,
    relations: TRelations,
    options?: Partial<
      EntitySchemaMetadata<SilkSchemaEntityWithRelations<TSilk, TRelations>>
    > &
      EntitySchemaWeaverOptions
  ) => EntitySilk<SilkSchemaEntityWithRelations<TSilk, TRelations>>
}

/**
 * @deprecated use `defineEntity` and `mikroSilk` instead.
 */
export type SilkSchemaEntityWithRelations<
  TSilk extends GraphQLSilk,
  TRelations extends Record<string, RelationProperty<any, any>> = never,
> = SilkSchemaEntity<TSilk> & InferRelations<TRelations>

/**
 * @deprecated use `defineEntity` and `mikroSilk` instead.
 */
export const weaveEntitySchemaBySilk: CallableEntitySchemaWeaver =
  Object.assign(
    (
      silk: GraphQLSilk,
      options?: Partial<EntitySchemaMetadata<any>> & EntitySchemaWeaverOptions
    ) => EntitySchemaWeaver.weave(silk, undefined, options),
    {
      withRelations: (
        silk: GraphQLSilk,
        relations: Record<string, RelationProperty<any, any>>,
        options?: Partial<EntitySchemaMetadata<any>> & EntitySchemaWeaverOptions
      ) => EntitySchemaWeaver.weave(silk, relations, options),
    }
  )

export type PropertyType = Exclude<
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

export interface EntitySchemaWeaverOptions {
  getProperty?: (
    gqlType: Exclude<GraphQLOutputType, GraphQLNonNull<any> | GraphQLList<any>>,
    filed: GraphQLField<any, any, any>
  ) => string | Partial<PropertyType> | undefined

  asObjectType?: Partial<GraphQLObjectTypeConfig<any, any>>
  weaverContext?: WeaverContext
}

export type SilkSchemaEntity<TSilk extends GraphQLSilk> =
  StandardSchemaV1.InferOutput<TSilk> & {
    [OptionalProps]?: NullishKeys<StandardSchemaV1.InferInput<TSilk>>
  }

export type GraphQLSilkEntity<TSilk extends GraphQLSilk> =
  SilkSchemaEntity<TSilk>

export type InferRelations<
  TRelations extends Record<string, RelationProperty<any, any>>,
> = {
  [TKey in keyof TRelations]: TRelations[TKey] extends WithNullable
    ? InferRelation<TRelations, TKey> | null
    : InferRelation<TRelations, TKey>
}

export type InferRelation<
  TRelations extends Record<string, RelationProperty<any, any>>,
  TKey extends keyof TRelations,
> = TRelations[TKey] extends ManyToOneProperty<infer TTarget, any>
  ? Reference<TTarget>
  : TRelations[TKey] extends OneToOneProperty<infer TTarget, any>
    ? Reference<TTarget>
    : TRelations[TKey] extends OneToManyProperty<infer TTarget, any>
      ? TTarget extends object
        ? Collection<TTarget>
        : never
      : TRelations[TKey] extends ManyToManyProperty<infer TTarget, any>
        ? TTarget extends object
          ? Collection<TTarget>
          : never
        : never

export type RelationProperty<TTarget extends object, TOwner> =
  | ManyToOneProperty<TTarget, TOwner>
  | OneToOneProperty<TTarget, TOwner>
  | OneToManyProperty<TTarget, TOwner>
  | ManyToManyProperty<TTarget, TOwner>

export interface ManyToOneProperty<TTarget extends object, _TOwner> {
  kind: ReferenceKind.MANY_TO_ONE | "m:1"
  entity: string | (() => string | EntityName<TTarget>)
  nullable?: boolean
}

/**
 * @deprecated use `defineEntity` instead.
 */
export function manyToOne<TTarget extends object, TOwner>(
  entity: string | (() => string | EntityName<TTarget>),
  options?: Omit<ManyToOneOptions<TOwner, TTarget>, "nullable"> & {
    nullable?: false
  }
): ManyToOneProperty<TTarget, TOwner>

/**
 * @deprecated use `defineEntity` instead.
 */
export function manyToOne<TTarget extends object, TOwner>(
  entity: string | (() => string | EntityName<TTarget>),
  options?: Omit<ManyToOneOptions<TOwner, TTarget>, "nullable"> & {
    nullable: true
  }
): ManyToOneProperty<TTarget, TOwner> & WithNullable

/**
 * @deprecated use `defineEntity` instead.
 */
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

export interface OneToManyProperty<TTarget extends object, _TOwner> {
  kind: ReferenceKind.ONE_TO_MANY | "1:m"
  entity: string | (() => string | EntityName<TTarget>)
}

/**
 * @deprecated use `defineEntity` instead.
 */
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

export interface OneToOneProperty<TTarget extends object, _TOwner> {
  kind: ReferenceKind.ONE_TO_ONE | "1:1"
  entity: string | (() => string | EntityName<TTarget>)
  nullable?: boolean
}

/**
 * @deprecated use `defineEntity` instead.
 */
export function oneToOne<TTarget extends object, TOwner>(
  entity: string | (() => string | EntityName<TTarget>),
  options?: Omit<OneToOneOptions<TOwner, TTarget>, "nullable"> & {
    nullable?: false
  }
): OneToOneProperty<TTarget, TOwner>

/**
 * @deprecated use `defineEntity` instead.
 */
export function oneToOne<TTarget extends object, TOwner>(
  entity: string | (() => string | EntityName<TTarget>),
  options?: Omit<OneToOneOptions<TOwner, TTarget>, "nullable"> & {
    nullable: true
  }
): OneToOneProperty<TTarget, TOwner> & WithNullable

/**
 * @deprecated use `defineEntity` instead.
 */
export function oneToOne<TTarget extends object, TOwner>(
  entity: string | (() => string | EntityName<TTarget>),
  options?: OneToOneOptions<TOwner, TTarget>
): OneToOneProperty<TTarget, TOwner> {
  return {
    kind: ReferenceKind.ONE_TO_ONE,
    entity,
    ref: true,
    ...options,
  }
}

export interface ManyToManyProperty<TTarget extends object, _TOwner> {
  kind: ReferenceKind.MANY_TO_MANY | "m:n"
  entity: string | (() => string | EntityName<TTarget>)
}

/**
 * @deprecated use `defineEntity` instead.
 */
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

type NullishKeys<T> = Exclude<
  NonNullable<
    {
      [K in keyof T]: undefined extends T[K] ? K : null extends T[K] ? K : never
    }[keyof T]
  >,
  undefined
>

export interface WithNullable {
  nullable: true
}

export type EntitySilk<TEntity> = EntitySchemaSilk<EntitySchema<TEntity>>
