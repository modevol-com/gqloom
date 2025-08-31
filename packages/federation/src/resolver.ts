import {
  ChainResolver,
  EasyDataLoader,
  type Executor,
  type GraphQLSilk,
  type Loom,
  type LoomObjectType,
  type MayPromise,
  type Middleware,
  ObjectChainResolver,
  type OmitInUnion,
  type RequireKeys,
  type ResolverOptions,
  type ResolverOptionsWithExtensions,
  type ResolverPayload,
  type SYMBOLS,
  type StandardSchemaV1,
  type ValueOf,
  applyMiddlewares,
  createInputParser,
  filterMiddlewares,
  getMemoizationMap,
  loom,
  silk,
} from "@gqloom/core"
import { GraphQLID, type GraphQLObjectTypeExtensions } from "graphql"
import type { ResolveReferenceExtension } from "."
import type { DirectiveList } from "./mock-ast"

export const resolver = Object.assign(
  (operations: Record<string, Loom.Operation>, options: ResolverOptions) =>
    new ChainResolver(operations, options),
  {
    of: ((parent, operations, options) =>
      new FederatedChainResolver(
        parent,
        operations,
        options
      )) as FederatedResolverFactory["of"],
  }
) as FederatedResolverFactory

export interface FederatedResolverFactory {
  /**
   * Creates a resolver for an object type
   * @template TParent - The parent type
   * @template TFields - The fields of the object type
   * @param parent - The parent type definition
   * @param fields - The fields to resolve
   * @param options - Optional resolver options
   */
  of<
    TParent extends GraphQLSilk,
    TFields extends Record<
      string,
      | Loom.Field<TParent, any, any, any>
      | Loom.Operation
      | typeof SYMBOLS.FIELD_HIDDEN
    >,
  >(
    parent: TParent,
    fields: TFields,
    options?: ResolverOptionsWithExtensions<
      OmitInUnion<ValueOf<TFields>, typeof SYMBOLS.FIELD_HIDDEN>
    >
  ): FederatedChainResolver<TParent, TFields>

  /**
   * Creates a resolver for operations
   * @template TFields - The operations to resolve
   * @param operations - The operations to resolve
   * @param options - Optional resolver options
   */
  <TFields extends Record<string, Loom.Operation>>(
    operations: TFields,
    options?: ResolverOptions<ValueOf<TFields>>
  ): ChainResolver<TFields>
}

export class FederatedChainResolver<
  TParent extends GraphQLSilk,
  TFields extends Record<
    string,
    Loom.FieldOrOperation | typeof SYMBOLS.FIELD_HIDDEN
  >,
  TRequiredKey extends
    | keyof StandardSchemaV1.InferOutput<TParent>
    | undefined = undefined,
> extends ObjectChainResolver<TParent, TFields> {
  /**
   * A directive decorates part of a GraphQL schema or operation with additional configuration.
   * @param directives - Directives for the root object of the resolver
   * @returns The resolver instance
   */
  public directives(directives: DirectiveList | Record<string, {}>) {
    this.meta.options ??= {}
    this.meta.options.extensions ??= {}
    this.meta.options.extensions = {
      ...this.meta.options.extensions,
      directives,
    }
    return this
  }

  /**
   * The `resolveReference` function enables your router's query planner to resolve a particular entity by whatever unique identifier your other subgraphs use to reference it.
   * @param resolve - The function to resolve the reference
   * @returns The resolver instance
   */
  public resolveReference<
    TRequiredKey extends
      keyof StandardSchemaV1.InferOutput<TParent> = keyof StandardSchemaV1.InferOutput<TParent>,
  >(
    resolve: (
      source: RequireKeys<
        NonNullable<StandardSchemaV1.InferOutput<TParent>>,
        TRequiredKey
      >,
      payload: Pick<ResolverPayload, "root" | "context" | "info"> | void
    ) => MayPromise<
      NonNullable<StandardSchemaV1.InferOutput<TParent>> | null | undefined
    >
  ): FederatedChainResolver<TParent, TFields, TRequiredKey> {
    this.meta.options ??= {}
    this.meta.options.extensions ??= {}
    this.meta.options.extensions = {
      ...this.meta.options.extensions,
      [FederatedChainResolver.EXTENSION_RESOLVE_REFERENCE]: resolve,
    }
    return this as any
  }

  /**
   * Loads and caches references in batch using DataLoader pattern.
   * This method is particularly useful in Federation mode when other services need to reference data from this service.
   *
   * @template TRequiredKey - The key type that must be present in the parent type
   * @param load - A function that loads multiple references in batch
   * @returns A resolver that uses DataLoader to batch and cache reference loading
   *
   * @example
   * ```ts
   * resolver.of(UserType, {
   *   id: field(silk(GraphQLID)),
   * }).loadReference(async (sources, payloads) => {
   *   // sources will be an array of objects with required keys
   *   // payloads will be an array of resolver payloads
   *   return await db.users.findMany({
   *     where: { id: { in: sources.map(s => s.id) } }
   *   });
   * });
   * ```
   */
  public loadReference<
    TRequiredKey extends
      keyof StandardSchemaV1.InferOutput<TParent> = keyof StandardSchemaV1.InferOutput<TParent>,
  >(
    load: (
      sources: RequireKeys<
        NonNullable<StandardSchemaV1.InferOutput<TParent>>,
        TRequiredKey
      >[],
      payloads: (Pick<ResolverPayload, "root" | "context" | "info"> | void)[]
    ) => MayPromise<
      (NonNullable<StandardSchemaV1.InferOutput<TParent>> | null | undefined)[]
    >
  ) {
    const initLoader = () =>
      new EasyDataLoader<
        [
          source: RequireKeys<
            NonNullable<StandardSchemaV1.InferOutput<TParent>>,
            TRequiredKey
          >,
          payload: Pick<ResolverPayload, "root" | "context" | "info"> | void,
        ],
        any
      >((args) => {
        const sources = args.map(([source]) => source)
        const payloads = args.map(([, payload]) => payload)
        return load(sources, payloads) as any
      })

    return this.resolveReference<TRequiredKey>((source, payload) => {
      const loader = (() => {
        if (!payload) return initLoader()
        const memoMap = getMemoizationMap(payload)
        if (!memoMap.has(load)) memoMap.set(load, initLoader())
        return memoMap.get(load) as ReturnType<typeof initLoader>
      })()
      return loader.load([source, payload])
    })
  }

  /** The extension name for the resolveReference function */
  public static EXTENSION_RESOLVE_REFERENCE =
    "gqloom.federation.resolveReference"

  /**
   * Add the resolveReference function to the parent object
   * @param middlewares - The middlewares to apply to the resolveReference function
   * @returns A function that adds the resolveReference function to the parent object
   */
  public static addResolveReference(middlewares: Middleware[]) {
    const field = FederatedChainResolver.referenceField
    return (parent: LoomObjectType): LoomObjectType => {
      const resolve = FederatedChainResolver.getResolveReference(
        parent.extensions
      )
      if (resolve) {
        const apollo: ResolveReferenceExtension<any, any>["apollo"] = {
          subgraph: {
            resolveReference: (root, context, info) => {
              const payload: ResolverPayload = {
                args: {},
                root,
                context,
                info,
                field,
              }
              return applyMiddlewares(
                {
                  operation: "resolveReference",
                  outputSilk: field["~meta"].output,
                  parent: undefined,
                  payload,
                  parseInput: createInputParser(
                    field["~meta"].input,
                    undefined
                  ),
                },
                () => resolve(root, payload),
                middlewares
              )
            },
          },
        }
        parent.mergeExtensions({ apollo })
      }
      return parent
    }
  }

  protected static getResolveReference(
    extensions?: Readonly<GraphQLObjectTypeExtensions<any, any>> | null
  ):
    | ((
        source: any,
        payload: Pick<ResolverPayload, "root" | "context" | "info"> | void
      ) => MayPromise<any>)
    | undefined {
    if (
      extensions &&
      FederatedChainResolver.EXTENSION_RESOLVE_REFERENCE in extensions
    ) {
      return extensions[FederatedChainResolver.EXTENSION_RESOLVE_REFERENCE] as (
        source: any,
        payload: Pick<ResolverPayload, "root" | "context" | "info"> | void
      ) => MayPromise<any>
    }
  }

  public toExecutor(
    ...middlewares: Middleware[]
  ): TRequiredKey extends undefined
    ? Executor<TFields>
    : Executor<TFields> & {
        $resolveReference: (
          source: Pick<
            NonNullable<StandardSchemaV1.InferOutput<TParent>>,
            NonNullable<TRequiredKey>
          >,
          payload: Pick<ResolverPayload, "root" | "context" | "info"> | void
        ) => MayPromise<
          NonNullable<StandardSchemaV1.InferOutput<TParent>> | null | undefined
        >
      } {
    const executor = super.toExecutor(...middlewares)
    const resolveReference = FederatedChainResolver.getResolveReference(
      this.meta.options?.extensions
    )
    if (resolveReference) {
      const mids = filterMiddlewares(
        "resolveReference",
        middlewares,
        this.meta.options?.middlewares
      )
      Object.assign(executor, {
        $resolveReference: (
          root: any,
          payload: Pick<ResolverPayload, "root" | "context" | "info"> | void
        ) => {
          const field = FederatedChainResolver.referenceField
          const payloadFull = { args: {}, field, ...payload } as ResolverPayload
          return applyMiddlewares(
            {
              operation: "resolveReference",
              outputSilk: field["~meta"].output,
              parent: undefined,
              payload: payloadFull,
              parseInput: createInputParser(field["~meta"].input, undefined),
            },
            () => resolveReference(root, payload),
            mids
          )
        },
      })
    }
    return executor as any
  }

  protected static referenceField: Loom.Field<any, any, any, any> = loom.field(
    silk(GraphQLID),
    () => undefined
  )

  /**
   * Gets the metadata for the resolver
   */
  public get "~meta"() {
    return this.meta
  }
}
