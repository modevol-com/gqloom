import {
  type FieldOrOperation,
  type MayPromise,
  resolverPayloadStorage,
  silk,
} from "@gqloom/core"
import { GraphQLID, type GraphQLResolveInfo } from "graphql"

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

const referenceField: FieldOrOperation<any, any, any, any> = {
  type: "field",
  output: silk(GraphQLID),
  input: undefined,
  resolve: async () => undefined,
}

export function resolveReference<
  TEntity extends object,
  TRequiredKey extends keyof TEntity,
>(
  resolve: (
    source: Pick<TEntity, TRequiredKey>
  ) => MayPromise<TEntity | null | undefined>
): ResolveReferenceExtension<TEntity, TRequiredKey> {
  return {
    apollo: {
      subgraph: {
        resolveReference: (root, context, info) =>
          resolverPayloadStorage.run(
            { root, args: {}, context, info, field: referenceField },
            () => resolve(root)
          ),
      },
    },
  }
}

export * from "./schema-weaver"
