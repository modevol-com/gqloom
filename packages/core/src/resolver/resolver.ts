import {
  getOperationOptions,
  applyMiddlewares,
  composeMiddlewares,
  getSubscriptionOptions,
} from "../utils"
import { parseInput } from "./input"
import type {
  FieldWeaver,
  QueryMutationOptions,
  QueryMutationWeaver,
  ResolvingOptions,
  ResolverWeaver,
  FieldOptions,
  OperationOrField,
  ResolverOptionsWithParent,
  AnyGraphQLFabric,
  GraphQLFabricIO,
  SubscriptionWeaver,
} from "./types"

export const RESOLVER_OPTIONS_KEY = Symbol("resolver-options")

function resolveForQueryMutation(
  options: QueryMutationOptions<GraphQLFabricIO, any, AnyGraphQLFabric>
): (input: any, options?: ResolvingOptions) => Promise<any> {
  return (input, resolvingOptions) => {
    const middlewares = composeMiddlewares(
      resolvingOptions?.middlewares,
      options.middlewares
    )
    return applyMiddlewares(middlewares, async () =>
      options.resolve(await parseInput(options.input, input))
    )
  }
}

function resolveForField(
  options: FieldOptions<GraphQLFabricIO, any, any, AnyGraphQLFabric>
): (parent: any, input: any, options?: ResolvingOptions) => Promise<any> {
  return (parent, input, resolvingOptions) => {
    const middlewares = composeMiddlewares(
      resolvingOptions?.middlewares,
      options.middlewares
    )
    return applyMiddlewares(middlewares, async () =>
      options.resolve(parent, await parseInput(options.input, input))
    )
  }
}

export const fabricQuery: QueryMutationWeaver<GraphQLFabricIO> = (
  output,
  resolveOrOptions
) => {
  const options = getOperationOptions(resolveOrOptions)
  return {
    input: options.input,
    output,
    resolve: resolveForQueryMutation(options),
    type: "query",
  }
}

export const fabricMutation: QueryMutationWeaver<GraphQLFabricIO> = (
  output,
  resolveOrOptions
) => {
  const options = getOperationOptions(resolveOrOptions)
  return {
    input: options.input,
    output,
    resolve: resolveForQueryMutation(options),
    type: "mutation",
  }
}

export const fabricField: FieldWeaver<GraphQLFabricIO> = (
  output,
  resolveOrOptions
) => {
  const options = getOperationOptions<"field">(resolveOrOptions)
  return {
    input: options.input,
    output,
    resolve: resolveForField(options),
    type: "field",
  }
}

export const defaultSubscriptionResolve = (source: any) => source

export const fabricSubscription: SubscriptionWeaver<GraphQLFabricIO> = (
  output,
  subscribeOrOptions
) => {
  const options = getSubscriptionOptions(subscribeOrOptions)
  return {
    input: options.input,
    output,
    subscribe: options.subscribe,
    resolve: options.resolve ?? defaultSubscriptionResolve,
    type: "subscription",
  }
}

function resolver(
  operations: Record<string, OperationOrField<any, any, any>>,
  options: ResolverOptionsWithParent<any> | undefined
) {
  const record: Record<string, OperationOrField<any, any, any>> & {
    [RESOLVER_OPTIONS_KEY]?: ResolverOptionsWithParent<any>
  } = {
    [RESOLVER_OPTIONS_KEY]: options,
  }

  Object.entries(operations).forEach(([name, operation]) => {
    const resolve =
      operation.type === "field"
        ? (
            parent: any,
            input: any,
            operationOptions: ResolvingOptions | undefined
          ) =>
            operation.resolve(parent, input, {
              ...operationOptions,
              middlewares: composeMiddlewares(
                operationOptions?.middlewares,
                options?.middlewares
              ),
            })
        : (input: any, operationOptions: ResolvingOptions | undefined) =>
            operation.resolve(input, {
              ...operationOptions,
              middlewares: composeMiddlewares(
                operationOptions?.middlewares,
                options?.middlewares
              ),
            })

    record[name] = { ...operation, resolve }
  })

  return record
}

export const fabricResolver: ResolverWeaver<GraphQLFabricIO> = Object.assign(
  resolver as any,
  {
    of: ((parent, operations, options) =>
      resolver(operations as Record<string, OperationOrField<any, any, any>>, {
        ...options,
        parent,
      })) as ResolverWeaver<GraphQLFabricIO>["of"],
  }
)
