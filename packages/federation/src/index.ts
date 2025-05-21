import type { MayPromise, ResolverPayload } from "@gqloom/core"
import type { GraphQLResolveInfo } from "graphql"

export interface ResolveReferenceExtension<
  TEntity extends object,
  TRequiredKey extends keyof TEntity,
> {
  apollo: {
    subgraph: {
      resolveReference: ResolveReference<TEntity, TRequiredKey>
    }
  }
}

type ResolveReference<
  TEntity extends object,
  TRequiredKey extends keyof TEntity,
> = (
  parent: Pick<TEntity, TRequiredKey>,
  context: object,
  info: GraphQLResolveInfo
) => MayPromise<TEntity | null | undefined>

export function resolveReference<
  TEntity extends object,
  TRequiredKey extends keyof TEntity,
>(
  resolve: (
    source: Pick<TEntity, TRequiredKey>,
    payload: Pick<ResolverPayload, "root" | "context" | "info">
  ) => MayPromise<TEntity | null | undefined>
): ResolveReferenceExtension<TEntity, TRequiredKey> {
  return {
    apollo: {
      subgraph: {
        resolveReference: (root, context, info) =>
          resolve(root, { root, context, info }),
      },
    },
  }
}

export * from "./resolver"
export * from "./schema-loom"
