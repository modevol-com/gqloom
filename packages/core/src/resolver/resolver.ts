import type { Middleware } from "../utils"
import {
  getOperationOptions,
  applyMiddlewares,
  compose,
  getSubscriptionOptions,
} from "../utils"
import { parseInput } from "./input"
import type {
  FieldShuttle,
  QueryMutationShuttle,
  ResolvingOptions,
  ResolverShuttle,
  OperationOrField,
  ResolverOptionsWithParent,
  GraphQLFabricIO,
  SubscriptionShuttle,
  Subscription,
} from "./types"

export const RESOLVER_OPTIONS_KEY = Symbol("resolver-options")

export const fabricQuery: QueryMutationShuttle<GraphQLFabricIO> = (
  output,
  resolveOrOptions
) => {
  const options = getOperationOptions(resolveOrOptions)
  return {
    input: options.input,
    output,
    resolve: (input, extraOptions) =>
      applyMiddlewares(
        compose(extraOptions?.middlewares, options.middlewares),
        async () => options.resolve(await parseInput(options.input, input))
      ),
    type: "query",
  }
}

export const fabricMutation: QueryMutationShuttle<GraphQLFabricIO> = (
  output,
  resolveOrOptions
) => {
  const options = getOperationOptions(resolveOrOptions)
  return {
    input: options.input,
    output,
    resolve: (input, extraOptions) =>
      applyMiddlewares(
        compose(extraOptions?.middlewares, options.middlewares),
        async () => options.resolve(await parseInput(options.input, input))
      ),
    type: "mutation",
  }
}

export const fabricField: FieldShuttle<GraphQLFabricIO> = (
  output,
  resolveOrOptions
) => {
  const options = getOperationOptions<"field">(resolveOrOptions)
  return {
    input: options.input,
    output,
    resolve: (parent, input, extraOptions) =>
      applyMiddlewares(
        compose(extraOptions?.middlewares, options.middlewares),
        async () =>
          options.resolve(parent, await parseInput(options.input, input))
      ),
    type: "field",
  }
}

export const defaultSubscriptionResolve = (source: any) => source

export const fabricSubscription: SubscriptionShuttle<GraphQLFabricIO> = (
  output,
  subscribeOrOptions
) => {
  const options = getSubscriptionOptions(subscribeOrOptions)
  return {
    input: options.input,
    output,
    subscribe: (input, extraOptions) =>
      applyMiddlewares(
        compose(extraOptions?.middlewares, options.middlewares),
        async () => options.subscribe(await parseInput(options.input, input))
      ),
    resolve: options.resolve ?? defaultSubscriptionResolve,
    type: "subscription",
  }
}

export function baseResolver(
  operations: Record<string, OperationOrField<any, any, any>>,
  options: ResolverOptionsWithParent | undefined
) {
  const record: Record<string, OperationOrField<any, any, any>> & {
    [RESOLVER_OPTIONS_KEY]?: ResolverOptionsWithParent
  } = {
    [RESOLVER_OPTIONS_KEY]: options,
  }

  Object.entries(operations).forEach(([name, operation]) => {
    record[name] = extraOperationOptions(operation, options)
  })

  return record
}

function extraOperationOptions<
  TOperation extends OperationOrField<any, any, any>,
>(
  operation: TOperation,
  options: ResolverOptionsWithParent<any> | undefined
): TOperation {
  const composeMiddlewares = (
    extraOptions: { middlewares?: Middleware[] } | undefined
  ): Middleware[] => compose(extraOptions?.middlewares, options?.middlewares)

  switch (operation.type) {
    case "field":
      return {
        ...operation,
        resolve: (parent, input, extraOptions) =>
          operation.resolve(parent, input, {
            ...extraOptions,
            middlewares: composeMiddlewares(extraOptions),
          }),
      }
    case "subscription":
      return {
        ...operation,
        subscribe: (input, extraOptions) =>
          (operation as Subscription<any, any, any>).subscribe(input, {
            ...extraOptions,
            middlewares: composeMiddlewares(extraOptions),
          }),
      }
    default:
      return {
        ...operation,
        resolve: (input: any, extraOptions: ResolvingOptions | undefined) =>
          operation.resolve(input, {
            ...extraOptions,
            middlewares: composeMiddlewares(extraOptions),
          }),
      }
  }
}

export const fabricResolver: ResolverShuttle<GraphQLFabricIO> = Object.assign(
  baseResolver as ResolverShuttle<GraphQLFabricIO>,
  {
    of: ((parent, operations, options) =>
      baseResolver(
        operations as Record<string, OperationOrField<any, any, any>>,
        { ...options, parent }
      )) as ResolverShuttle<GraphQLFabricIO>["of"],
  }
)
