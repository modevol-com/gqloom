import {
  ChainResolver,
  type GraphQLSilk,
  type Loom,
  type MayPromise,
  ObjectChainResolver,
  type OmitInUnion,
  type ResolverOptions,
  type ResolverOptionsWithExtensions,
  type SYMBOLS,
  type StandardSchemaV1,
  type ValueOf,
  loom,
  resolverPayloadStorage,
  silk,
} from "@gqloom/core"
import { GraphQLID } from "graphql"
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
  of<
    TParent extends GraphQLSilk,
    TFields extends Record<
      string,
      | Loom.Field<TParent, any, any>
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
      source: Pick<
        NonNullable<StandardSchemaV1.InferOutput<TParent>>,
        TRequiredKey
      >
    ) => MayPromise<
      NonNullable<StandardSchemaV1.InferOutput<TParent>> | null | undefined
    >
  ) {
    this.meta.options ??= {}
    this.meta.options.extensions ??= {}
    const apollo = (this.meta.options.extensions.apollo ??
      {}) as ResolveReferenceExtension<
      StandardSchemaV1.InferOutput<TParent>,
      TRequiredKey
    >["apollo"]
    ;(apollo.subgraph as {}) ??= {}
    apollo.subgraph.resolveReference = (root, context, info) =>
      resolverPayloadStorage.run(
        {
          root,
          args: {},
          context,
          info,
          field: referenceField,
        },
        () => resolve(root)
      )

    this.meta.options.extensions = {
      ...this.meta.options.extensions,
      apollo,
    }
    return this
  }
}

export const referenceField: Loom.Field<any, any, any> = loom.field(
  silk(GraphQLID),
  () => undefined
)
