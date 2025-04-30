import type {
  FieldOptions,
  GraphQLFieldOptions,
  MutationOptions,
  QueryOptions,
  SubscriptionOptions,
} from "../resolver/types"

export function getOperationOptions(
  resolveOrOptions:
    | ((...args: any) => any)
    | FieldOptions<any, any, any, any>
    | QueryOptions<any, any>
    | MutationOptions<any, any>
) {
  if (typeof resolveOrOptions === "function") {
    return { resolve: resolveOrOptions }
  }
  return resolveOrOptions as any
}

export function getSubscriptionOptions(
  subscribeOrOptions: (() => any) | SubscriptionOptions<any, any, any>
): SubscriptionOptions<any, any, any> {
  if (typeof subscribeOrOptions === "function") {
    return { subscribe: subscribeOrOptions }
  }
  return subscribeOrOptions
}

export function getFieldOptions({
  description,
  deprecationReason,
  extensions,
}: GraphQLFieldOptions): GraphQLFieldOptions {
  return {
    description,
    deprecationReason,
    extensions,
  }
}
