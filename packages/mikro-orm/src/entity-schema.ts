import {
  type GraphQLSilk,
  mapValue,
  notNullish,
  getGraphQLType,
  SYMBOLS,
  type AbstractSchemaIO,
  type InferSchemaI,
  type InferSchemaO,
  type GraphQLSilkIO,
  type GQLoomExtensions,
  weaverContext,
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
  type GraphQLField,
} from "graphql"
import { type GQLoomMikroFieldExtensions } from "./types"

export class EntitySchemaWeaver {
  static weave(
    silk: GraphQLSilk<any, any>,
    relations?: Record<string, RelationProperty<any, object>>,
    options?: EntitySchemaMetadata<any> & EntitySchemaWeaverOptions
  ) {
    const gqlType = getGraphQLTypeWithName(silk, options?.name)
    if (!(gqlType instanceof GraphQLObjectType))
      throw new Error("Only object type can be converted to entity schema")

    return new EntitySchema({
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

    let simpleType: EntityProperty["type"] | undefined =
      options?.getPropertyType?.(gqlType, field)

    if (simpleType == null) {
      if (gqlType instanceof GraphQLScalarType) {
        simpleType = EntitySchemaWeaver.getGraphQLScalarType(gqlType)
      } else if (gqlType instanceof GraphQLObjectType) {
        simpleType = "json"
      } else {
        simpleType = "string"
      }
    }
    const type: EntityProperty["type"] = isList ? `${simpleType}[]` : simpleType

    const extensions = field.extensions as GQLoomMikroFieldExtensions &
      GQLoomExtensions
    if (extensions.defaultValue !== undefined) nullable = false

    return { type, nullable }
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
  name?: string | null
) {
  const lastName = weaverContext.names.get(silk)
  try {
    if (name != null) weaverContext.names.set(silk, name)
    return getGraphQLType(silk)
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
    TRelation extends Record<
      string,
      RelationProperty<any, InferSchemaO<TSilk, TSchemaIO>>
    > = never,
  >(
    silk: TSilk,
    relations: TRelation,
    options?: EntitySchemaMetadata<SilkSchemaEntity<TSilk, TSchemaIO>> &
      EntitySchemaWeaverOptions
  ) => EntitySchema<
    SilkSchemaEntity<TSilk, TSchemaIO> & InferRelations<TRelation>
  >
}

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
  getPropertyType?: (
    gqlType: Exclude<GraphQLOutputType, GraphQLNonNull<any> | GraphQLList<any>>,
    filed: GraphQLField<any, any, any>
  ) => string | undefined
}

export type SilkSchemaEntity<
  TSilk,
  TSchemaIO extends AbstractSchemaIO,
> = InferSchemaO<TSilk, TSchemaIO> & {
  [OptionalProps]: NullishKeys<InferSchemaI<TSilk, TSchemaIO>>
}

export type GraphQLSilkEntity<TSilk> = SilkSchemaEntity<TSilk, GraphQLSilkIO>

export type InferRelations<
  TRelation extends Record<string, RelationProperty<any, any>>,
> = {
  [key in keyof TRelation]: TRelation[key] extends ManyToOneProperty<
    infer TTarget,
    any
  >
    ? Ref<TTarget>
    : TRelation[key] extends OneToOneProperty<infer TTarget, any>
      ? Ref<TTarget>
      : TRelation[key] extends OneToManyProperty<infer TTarget, any>
        ? TTarget extends object
          ? Collection<TTarget>
          : never
        : TRelation[key] extends ManyToManyProperty<infer TTarget, any>
          ? TTarget extends object
            ? Collection<TTarget>
            : never
          : never
}

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

type NullishKeys<T> = Exclude<
  NonNullable<
    {
      [K in keyof T]: undefined extends T[K] ? K : null extends T[K] ? K : never
    }[keyof T]
  >,
  undefined
>
