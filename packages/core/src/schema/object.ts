import {
  type GraphQLArgument,
  type GraphQLFieldConfig,
  type GraphQLFieldConfigArgumentMap,
  type GraphQLFieldMap,
  type GraphQLObjectTypeConfig,
  type ThunkObjMap,
  GraphQLObjectType,
  assertName,
  isObjectType,
  resolveObjMapThunk,
  isListType,
  GraphQLList,
  GraphQLNonNull,
  isNonNullType,
  type GraphQLFieldResolver,
  type GraphQLOutputType,
  type GraphQLField,
} from "graphql"
import type { SilkOperationOrField } from "./types"
import {
  mapValue,
  markErrorLocation,
  resolverPayloadStorage,
  toObjMap,
} from "../utils"
import {
  initWeaverContext,
  provideWeaverContext,
  weaverContext,
  type WeaverContext,
} from "./weaver-context"
import { inputToArgs } from "./input"
import { type ResolvingOptions, defaultSubscriptionResolve } from "../resolver"
import { createFieldNode, createObjectTypeNode } from "./definition-node"
import { extractDirectives } from "./directive"

export class LoomObjectType extends GraphQLObjectType {
  protected extraFields = new Map<string, SilkOperationOrField>()

  protected weaverContext: WeaverContext
  protected resolverOptions?: ResolvingOptions
  constructor(
    objectOrGetter:
      | string
      | GraphQLObjectType
      | GraphQLObjectTypeConfig<any, any>
      | (() => GraphQLObjectType | GraphQLObjectTypeConfig<any, any>),
    {
      weaverContext,
      resolverOptions,
    }: {
      weaverContext?: WeaverContext
      resolverOptions?: ResolvingOptions
    } = {}
  ) {
    const origin =
      typeof objectOrGetter === "function" ? objectOrGetter() : objectOrGetter

    const config: GraphQLObjectTypeConfig<any, any> = (() => {
      if (isObjectType(origin)) {
        return origin.toConfig()
      } else if (typeof origin === "string") {
        return { name: origin, fields: {} }
      } else {
        return origin
      }
    })()

    // AST node has to be manually created in order to define directives
    const directives = extractDirectives(config)
    super({ ...config, astNode: createObjectTypeNode(config.name, directives) })

    this.resolverOptions = resolverOptions
    this.weaverContext = weaverContext ?? initWeaverContext()
  }

  addField(name: string, resolver: SilkOperationOrField) {
    const existing = this.extraFields.get(name)
    if (existing && existing !== resolver) {
      throw new Error(`Field ${name} already exists in ${this.name}`)
    }
    this.extraFields.set(name, resolver)
  }

  override getFields(): GraphQLFieldMap<any, any> {
    const fields = mapValue<GraphQLField<any, any>, GraphQLField<any, any>>(
      super.getFields(),
      (f, name) => ({
        ...f,
        astNode: createFieldNode(name, f.type, extractDirectives(f)),
      })
    )
    const extraField = provideWeaverContext(
      () =>
        defineFieldMap(
          mapToFieldConfig(this.extraFields, this.resolverOptions)
        ),
      this.weaverContext
    )
    return {
      ...fields,
      ...extraField,
    }
  }
}

export function mapToFieldConfig(
  map: Map<string, SilkOperationOrField>,
  resolverOptions?: ResolvingOptions
): Record<string, GraphQLFieldConfig<any, any>> {
  const record: Record<string, GraphQLFieldConfig<any, any>> = {}

  for (const [name, field] of map.entries()) {
    record[name] = toFieldConfig(name, field, resolverOptions)
  }

  return record
}

export function toFieldConfig(
  name: string,
  field: SilkOperationOrField,
  resolverOptions?: ResolvingOptions
): GraphQLFieldConfig<any, any> {
  try {
    let outputType = getCacheType(field.output.getType())

    if (isObjectType(outputType)) {
      outputType.astNode ??= createObjectTypeNode(
        outputType.name,
        extractDirectives(outputType)
      )
    }

    if ((field.nonNull ?? field.output.nonNull) && !isNonNullType(outputType)) {
      outputType = new GraphQLNonNull(outputType)
    }

    // AST node has to be manually created in order to define directives
    const directives = extractDirectives(field)

    return {
      ...extract(field),
      astNode: createFieldNode(name, outputType, directives),
      type: outputType,
      args: inputToArgs(field.input),
      ...provideForResolve(field, resolverOptions),
      ...provideForSubscribe(field, resolverOptions),
    }
  } catch (error) {
    throw markErrorLocation(error)
  }
}

function extract({
  deprecationReason,
  description,
  extensions,
}: SilkOperationOrField): Partial<GraphQLFieldConfig<any, any>> {
  return {
    description,
    deprecationReason,
    extensions,
  }
}

function getCacheType(gqlType: GraphQLOutputType): GraphQLOutputType {
  if (gqlType instanceof LoomObjectType) return gqlType
  if (isObjectType(gqlType)) {
    const gqlObject = weaverContext.modifiableObjectMap?.get(gqlType)
    if (gqlObject != null) return gqlObject
  } else if (isListType(gqlType)) {
    return new GraphQLList(getCacheType(gqlType.ofType))
  } else if (isNonNullType(gqlType)) {
    return new GraphQLNonNull(getCacheType(gqlType.ofType))
  }
  return gqlType
}

function provideForResolve(
  field: SilkOperationOrField,
  resolverOptions?: ResolvingOptions
): Pick<GraphQLFieldConfig<any, any>, "resolve"> | undefined {
  if (field?.resolve == null) return
  if (field.resolve === defaultSubscriptionResolve)
    return { resolve: defaultSubscriptionResolve }
  const resolve: GraphQLFieldResolver<any, any> =
    field.type === "field"
      ? (root, args, context, info) =>
          resolverPayloadStorage.run({ root, args, context, info, field }, () =>
            field.resolve(root, args, resolverOptions)
          )
      : field.type === "subscription"
        ? (root, args, context, info) =>
            resolverPayloadStorage.run(
              { root, args, context, info, field },
              () => field.resolve(root, args)
            )
        : (root, args, context, info) =>
            resolverPayloadStorage.run(
              { root, args, context, info, field },
              () => field.resolve(args, resolverOptions)
            )

  return { resolve }
}

function provideForSubscribe(
  field: SilkOperationOrField,
  resolverOptions?: ResolvingOptions
): Pick<GraphQLFieldConfig<any, any>, "subscribe"> | undefined {
  if (field?.subscribe == null) return
  return {
    subscribe: (root, args, context, info) =>
      resolverPayloadStorage.run({ root, args, context, info, field }, () =>
        field.subscribe?.(args, resolverOptions)
      ),
  }
}

// https://github.com/graphql/graphql-js/blob/main/src/type/definition.ts#L774
function defineFieldMap(
  fields: ThunkObjMap<GraphQLFieldConfig<any, any>>
): GraphQLFieldMap<any, any> {
  const fieldMap = resolveObjMapThunk(fields)

  return mapValue(fieldMap, (fieldConfig, fieldName) => {
    const argsConfig = fieldConfig.args ?? {}
    return {
      name: assertName(fieldName),
      description: fieldConfig.description,
      type: fieldConfig.type,
      args: defineArguments(argsConfig),
      resolve: fieldConfig.resolve,
      subscribe: fieldConfig.subscribe,
      deprecationReason: fieldConfig.deprecationReason,
      extensions: toObjMap(fieldConfig.extensions),
      astNode: fieldConfig.astNode,
    }
  })
}

// https://github.com/graphql/graphql-js/blob/main/src/type/definition.ts#L795
function defineArguments(
  args: GraphQLFieldConfigArgumentMap
): ReadonlyArray<GraphQLArgument> {
  return Object.entries(args).map(([argName, argConfig]) => ({
    name: assertName(argName),
    description: argConfig.description,
    type: argConfig.type,
    defaultValue: argConfig.defaultValue,
    deprecationReason: argConfig.deprecationReason,
    extensions: toObjMap(argConfig.extensions),
    astNode: argConfig.astNode,
  }))
}
