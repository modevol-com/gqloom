import {
  type GraphQLSilk,
  mapValue,
  notNullish,
  getGraphQLType,
  type AbstractSchemaIO,
  type InferSchemaI,
  type InferSchemaO,
  type GraphQLSilkIO,
  type GQLoomExtensions,
  weaverContext,
  provideWeaverContext,
  type WeaverContext,
} from "@gqloom/core"
import {
  EntitySchema,
  type ManyToOneOptions,
  ReferenceKind,
  type EntitySchemaProperty,
  type OneToManyOptions,
  type OneToOneOptions,
  type ManyToManyOptions,
  type Reference,
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
  type GraphQLField,
} from "graphql"
import { type GQLoomMikroFieldExtensions } from "./types"
import { EntityGraphQLTypes, unwrapGraphQLType } from "./utils"

export class EntitySchemaWeaver {
  static weave(
    silk: GraphQLSilk<any, any>,
    relations?: Record<string, RelationProperty<any, object>>,
    options?: EntitySchemaMetadata<any> & EntitySchemaWeaverOptions
  ) {
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

    EntityGraphQLTypes.set(entity, gqlType)

    return entity
  }

  static toProperties(
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

  static getPropertyType(
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
        : typeOrProperty ?? {}

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

  static getGraphQLScalarType(
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

  static createWeaver<TSchemaIO extends AbstractSchemaIO>(
    toSilk: (schema: TSchemaIO[0]) => GraphQLSilk,
    creatorOptions: EntitySchemaWeaverOptions = {}
  ): CallableEntitySchemaWeaver<TSchemaIO> {
    return Object.assign(
      (
        silk: TSchemaIO[0],
        options?: EntitySchemaMetadata<any> & EntitySchemaWeaverOptions
      ) =>
        EntitySchemaWeaver.weave(toSilk(silk), undefined, {
          ...creatorOptions,
          ...options,
        } as EntitySchemaMetadata<any> & EntitySchemaWeaverOptions),
      {
        withRelations: (
          silk: TSchemaIO[0],
          relations: Record<string, RelationProperty<any, any>>,
          options?: EntitySchemaMetadata<any> & EntitySchemaWeaverOptions
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

export interface CallableEntitySchemaWeaver<
  TSchemaIO extends AbstractSchemaIO,
> {
  <TSilk extends TSchemaIO[0]>(
    silk: TSilk,
    options?: EntitySchemaMetadata<SilkSchemaEntity<TSilk, TSchemaIO>> &
      EntitySchemaWeaverOptions
  ): EntitySchema<SilkSchemaEntity<TSilk, TSchemaIO>>

  withRelations: <
    TSilk extends TSchemaIO[0],
    TRelations extends Record<
      string,
      RelationProperty<any, InferSchemaO<TSilk, TSchemaIO>>
    > = never,
  >(
    silk: TSilk,
    relations: TRelations,
    options?: EntitySchemaMetadata<
      SilkSchemaEntityWithRelations<TSchemaIO, TSilk, TRelations>
    > &
      EntitySchemaWeaverOptions
  ) => EntitySchema<SilkSchemaEntityWithRelations<TSchemaIO, TSilk, TRelations>>
}

export type SilkSchemaEntityWithRelations<
  TSchemaIO extends AbstractSchemaIO,
  TSilk extends TSchemaIO[0],
  TRelations extends Record<string, RelationProperty<any, any>> = never,
> = SilkSchemaEntity<TSilk, TSchemaIO> & InferRelations<TRelations>

export const weaveEntitySchemaBySilk: CallableEntitySchemaWeaver<GraphQLSilkIO> =
  Object.assign(
    (
      silk: GraphQLSilk,
      options?: EntitySchemaMetadata<any> & EntitySchemaWeaverOptions
    ) => EntitySchemaWeaver.weave(silk, undefined, options),
    {
      withRelations: (
        silk: GraphQLSilk,
        relations: Record<string, RelationProperty<any, any>>,
        options?: EntitySchemaMetadata<any> & EntitySchemaWeaverOptions
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

  weaverContext?: WeaverContext
}

export type SilkSchemaEntity<
  TSilk,
  TSchemaIO extends AbstractSchemaIO,
> = InferSchemaO<TSilk, TSchemaIO> & {
  [OptionalProps]: NullishKeys<InferSchemaI<TSilk, TSchemaIO>>
}

export type GraphQLSilkEntity<TSilk> = SilkSchemaEntity<TSilk, GraphQLSilkIO>

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
> =
  TRelations[TKey] extends ManyToOneProperty<infer TTarget, any>
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

export type ManyToOneProperty<TTarget extends object, TOwner> = Extract<
  EntitySchemaProperty<TTarget, TOwner>,
  { kind: ReferenceKind.MANY_TO_ONE | "m:1" }
>

export function manyToOne<TTarget extends object, TOwner>(
  entity: string | (() => string | EntityName<TTarget>),
  options?: Omit<ManyToOneOptions<TOwner, TTarget>, "nullable"> & {
    nullable?: false
  }
): ManyToOneProperty<TTarget, TOwner>
export function manyToOne<TTarget extends object, TOwner>(
  entity: string | (() => string | EntityName<TTarget>),
  options?: Omit<ManyToOneOptions<TOwner, TTarget>, "nullable"> & {
    nullable: true
  }
): ManyToOneProperty<TTarget, TOwner> & WithNullable
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
  options?: Omit<OneToOneOptions<TOwner, TTarget>, "nullable"> & {
    nullable?: false
  }
): OneToOneProperty<TTarget, TOwner>
export function oneToOne<TTarget extends object, TOwner>(
  entity: string | (() => string | EntityName<TTarget>),
  options?: Omit<OneToOneOptions<TOwner, TTarget>, "nullable"> & {
    nullable: true
  }
): OneToOneProperty<TTarget, TOwner> & WithNullable
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
