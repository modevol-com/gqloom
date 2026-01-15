import {
  type GraphQLFieldConfig,
  type GraphQLFieldMap,
  GraphQLList,
  type GraphQLNamedType,
  GraphQLNonNull,
  GraphQLObjectType,
  type GraphQLObjectTypeConfig,
  type GraphQLOutputType,
  GraphQLUnionType,
  isEnumType,
  isInterfaceType,
  isListType,
  isNonNullType,
  isObjectType,
  isScalarType,
  isUnionType,
} from "graphql"
import {
  createInputParser,
  getGraphQLType,
  type Loom,
  type ResolverOptions,
} from "../resolver"
import {
  applyMiddlewares,
  deepMerge,
  filterMiddlewares,
  pascalCase,
  toFieldMap,
} from "../utils"
import { AUTO_ALIASING } from "../utils/constants"
import { inputToArgs } from "./input"
import {
  initWeaverContext,
  provideWeaverContext,
  WeaverContext,
  weaverContext,
} from "./weaver-context"

export class LoomObjectType extends GraphQLObjectType {
  protected extraFields = new Map<string, Loom.BaseField>()
  protected hiddenFields = new Set<string>()

  protected weaverContext: WeaverContext
  protected globalOptions?: ResolverOptions
  /**
   * field name -> resolver
   */
  protected resolvers: Map<string, Loom.Resolver>

  public constructor(
    objectOrGetter:
      | string
      | GraphQLObjectType
      | GraphQLObjectTypeConfig<any, any>
      | (() => GraphQLObjectType | GraphQLObjectTypeConfig<any, any>),
    options: {
      weaverContext?: WeaverContext
      globalOptions?: ResolverOptions
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

    super(config)
    this.globalOptions = options.globalOptions
    this.weaverContext = options.weaverContext ?? initWeaverContext()
    this.resolvers = new Map()

    if (this.name === AUTO_ALIASING) {
      WeaverContext.autoAliasTypes.add(this)
    }
  }

  public addAlias(alias?: string) {
    if (!WeaverContext.autoAliasTypes.has(this) || !alias) return
    const name = alias.length < this.name.length ? alias : this.name
    this.name = name
  }

  public hideField(name: string) {
    this.hiddenFields.add(name)
    delete this._fieldsCache
  }

  public addField(
    name: string,
    field: Loom.BaseField,
    resolver: Loom.Resolver | undefined
  ) {
    const existing = this.extraFields.get(name)
    if (existing && existing !== field) {
      throw new Error(`Field ${name} already exists in ${this.name}`)
    }
    this.extraFields.set(name, field)
    if (resolver) this.resolvers.set(name, resolver)
    delete this._fieldsCache
  }

  public mergeExtensions(
    extensions: GraphQLObjectTypeConfig<any, any>["extensions"]
  ) {
    this.extensions = deepMerge(this.extensions, extensions)
  }

  protected collectedFieldNames() {
    const fieldsBySuper = super.getFields()
    Object.entries(fieldsBySuper).forEach(
      ([fieldName, field]) =>
        (field.type = this.getCacheType(field.type, fieldName))
    )
  }

  private extraFieldMap?: GraphQLFieldMap<any, any>
  private _fieldsCache?: GraphQLFieldMap<any, any>
  public override getFields(): GraphQLFieldMap<any, any> {
    if (this._fieldsCache) return this._fieldsCache
    const fieldsBySuper = super.getFields()
    this.collectedFieldNames()
    const extraFields = provideWeaverContext(
      () => toFieldMap(this.mapToFieldConfig(this.extraFields)),
      this.weaverContext
    )

    if (
      Object.keys(this.extraFieldMap ?? {}).join() !==
      Object.keys(extraFields).join()
    ) {
      this.extraFieldMap = extraFields
    }

    const answer = {
      ...fieldsBySuper,
      ...this.extraFieldMap,
    }
    for (const fieldName of this.hiddenFields) {
      delete answer[fieldName]
    }
    this._fieldsCache = answer
    return answer
  }

  protected mapToFieldConfig(
    map: Map<string, Loom.BaseField>
  ): Record<string, GraphQLFieldConfig<any, any>> {
    const record: Record<string, GraphQLFieldConfig<any, any>> = {}

    for (const [name, field] of map.entries()) {
      record[name] = this.toFieldConfig(field, name)
    }

    return record
  }

  public toFieldConfig(
    field: Loom.BaseField,
    fieldName: string
  ): GraphQLFieldConfig<any, any> {
    const outputType = this.getCacheType(
      getGraphQLType(field["~meta"].output),
      fieldName
    )

    const resolve = this.provideForResolve(field, fieldName)
    const subscribe = this.provideForSubscribe(field, fieldName)

    return {
      ...extract(field),
      type: outputType,
      args: inputToArgs(field["~meta"].input, { fieldName }),
      resolve,
      ...(subscribe ? { subscribe } : {}),
    }
  }

  protected provideForResolve(
    field: Loom.BaseField,
    fieldName: string
  ): GraphQLFieldConfig<any, any>["resolve"] {
    const resolverMiddlewares =
      this.resolvers.get(fieldName)?.["~meta"].options?.middlewares
    switch (field["~meta"].operation) {
      case "query":
      case "mutation": {
        const operation = field["~meta"].operation
        const middlewares = filterMiddlewares(
          operation,
          this.globalOptions?.middlewares,
          resolverMiddlewares,
          field["~meta"].middlewares
        )
        return (root, args, context, info) => {
          const payload = { root, args, context, info, field }
          const parseInput = createInputParser(field["~meta"].input, args)
          return applyMiddlewares(
            {
              operation,
              outputSilk: field["~meta"].output,
              parent: undefined,
              parseInput,
              payload,
            },
            async () =>
              field["~meta"].resolve(await parseInput.getResult(), payload),
            middlewares
          )
        }
      }
      case "field": {
        const middlewares = filterMiddlewares(
          "field",
          this.globalOptions?.middlewares,
          resolverMiddlewares,
          field["~meta"].middlewares
        )
        return (root, args, context, info) => {
          const payload = { root, args, context, info, field }
          const parseInput = createInputParser(field["~meta"].input, args)
          return applyMiddlewares(
            {
              operation: "field",
              outputSilk: field["~meta"].output,
              parent: root,
              parseInput,
              payload,
            },
            async () =>
              field["~meta"].resolve(
                root,
                await parseInput.getResult(),
                payload
              ),
            middlewares
          )
        }
      }
      case "subscription": {
        const middlewares = filterMiddlewares(
          "subscription.resolve",
          this.globalOptions?.middlewares,
          resolverMiddlewares,
          field["~meta"].middlewares
        )
        return (root, args, context, info) => {
          const payload = { root, args, context, info, field }
          const parseInput = createInputParser(field["~meta"].input, args)
          return applyMiddlewares(
            {
              operation: "subscription.resolve",
              outputSilk: field["~meta"].output,
              parent: root,
              parseInput,
              payload,
            },
            async () =>
              field["~meta"].resolve(
                root,
                await parseInput.getResult(),
                payload
              ),
            middlewares
          )
        }
      }
    }
  }

  protected provideForSubscribe(
    field: Loom.BaseField | Loom.Subscription<any, any, any>,
    fieldName: string
  ): GraphQLFieldConfig<any, any>["subscribe"] | undefined {
    if (
      (field as Loom.Subscription<any, any, any>)?.["~meta"]?.subscribe == null
    )
      return

    const resolverMiddlewares =
      this.resolvers.get(fieldName)?.["~meta"].options?.middlewares
    const middlewares = filterMiddlewares(
      "subscription.subscribe",
      this.globalOptions?.middlewares,
      resolverMiddlewares,
      field["~meta"].middlewares
    )
    return (source, args, context, info) => {
      const payload = { root: source, args, context, info, field }
      const parseInput = createInputParser(field["~meta"].input, args)
      return applyMiddlewares(
        {
          operation: "subscription.subscribe",
          outputSilk: field["~meta"].output,
          parent: undefined,
          parseInput,
          payload,
        },
        async () =>
          (field as Loom.Subscription<any, any, any>)["~meta"].subscribe(
            await parseInput.getResult(),
            payload
          ),
        middlewares
      )
    }
  }

  protected getCacheType(
    gqlType: GraphQLOutputType,
    fieldName?: string
  ): GraphQLOutputType {
    return getCacheType(gqlType, { ...this.options, fieldName, parent: this })
  }

  public get options() {
    const { globalOptions: resolverOptions, weaverContext } = this
    return { resolverOptions, weaverContext }
  }
}

function extract(field: Loom.BaseField): Partial<GraphQLFieldConfig<any, any>> {
  const { deprecationReason, description, extensions } = field["~meta"]
  return {
    description,
    deprecationReason,
    extensions,
  }
}

export const OPERATION_OBJECT_NAMES = new Set([
  "Query",
  "Mutation",
  "Subscription",
])

export function getCacheType(
  gqlType: GraphQLOutputType,
  options: {
    weaverContext?: WeaverContext
    resolverOptions?: ResolverOptions
    fieldName?: string
    parent?: LoomObjectType
  } = {}
): GraphQLOutputType {
  const context = options.weaverContext ?? weaverContext

  if (gqlType instanceof LoomObjectType) return gqlType
  const parent = excludeOperationObject(options.parent)
  const fieldName = options.fieldName
    ? pascalCase(options.fieldName)
    : undefined
  if (isObjectType(gqlType)) {
    const gqlObject = context.loomObjectMap?.get(gqlType)
    if (gqlObject != null) {
      context.setAlias(gqlObject, fieldName, parent)
      return gqlObject
    }

    const loomObject = new LoomObjectType(gqlType, options)
    context.loomObjectMap?.set(gqlType, loomObject)
    context.setAlias(loomObject, fieldName, parent)
    return loomObject
  } else if (isListType(gqlType)) {
    return new GraphQLList(getCacheType(gqlType.ofType, options))
  } else if (isNonNullType(gqlType)) {
    return new GraphQLNonNull(getCacheType(gqlType.ofType, options))
  } else if (isUnionType(gqlType)) {
    const existing = context.loomUnionMap?.get(gqlType)
    if (existing != null) {
      context.setAlias(existing, fieldName, parent)
      return existing
    }
    const config = gqlType.toConfig()
    const unionType = new GraphQLUnionType({
      ...config,
      types: config.types.map(
        (type, i) =>
          getCacheType(type, {
            ...options,
            fieldName: options.fieldName
              ? `${options.fieldName}Item${i + 1}`
              : undefined,
          }) as GraphQLObjectType
      ),
    })
    context.loomUnionMap?.set(gqlType, unionType)
    context.setAlias(unionType, fieldName, parent)
    return unionType
  } else if (
    isEnumType(gqlType) ||
    isInterfaceType(gqlType) ||
    isScalarType(gqlType)
  ) {
    context.setAlias(gqlType, fieldName, parent)
    return gqlType
  }
  return gqlType
}

function excludeOperationObject(
  object: GraphQLNamedType | undefined
): GraphQLNamedType | undefined {
  if (object == null) return undefined
  if (OPERATION_OBJECT_NAMES.has(object.name)) return undefined
  return object
}
