import {
  getOperationOptions,
  applyMiddlewares,
  composeMiddlewares,
  getSubscriptionOptions,
} from "../utils"
import { parseInput } from "./input"
import type {
  FieldWeaver,
  QueryMutationWeaver,
  ResolvingOptions,
  ResolverWeaver,
  OperationOrField,
  ResolverOptionsWithParent,
  GraphQLFabricIO,
  SubscriptionWeaver,
  Subscription,
} from "./types"

export const RESOLVER_OPTIONS_KEY = Symbol("resolver-options")

export const fabricQuery: QueryMutationWeaver<GraphQLFabricIO> = (
  output,
  resolveOrOptions
) => {
  const options = getOperationOptions(resolveOrOptions)
  return {
    input: options.input,
    output,
    resolve: (input, extraOptions) =>
      applyMiddlewares(composeMiddlewares(extraOptions, options), async () =>
        options.resolve(await parseInput(options.input, input))
      ),
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
    resolve: (input, extraOptions) =>
      applyMiddlewares(composeMiddlewares(extraOptions, options), async () =>
        options.resolve(await parseInput(options.input, input))
      ),
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
    resolve: (parent, input, extraOptions) =>
      applyMiddlewares(composeMiddlewares(extraOptions, options), async () =>
        options.resolve(parent, await parseInput(options.input, input))
      ),
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
    subscribe: (input, extraOptions) =>
      applyMiddlewares(composeMiddlewares(extraOptions, options), async () =>
        options.subscribe(await parseInput(options.input, input))
      ),
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
    record[name] = (() => {
      switch (operation.type) {
        case "field":
          return {
            ...operation,
            resolve: (parent, input, extraOptions) =>
              operation.resolve(parent, input, {
                ...extraOptions,
                middlewares: composeMiddlewares(extraOptions, options),
              }),
          }
        case "subscription":
          return {
            ...operation,
            subscribe: (input, extraOptions) =>
              (operation as Subscription<any, any, any>).subscribe(input, {
                ...extraOptions,
                middlewares: composeMiddlewares(extraOptions, options),
              }),
          }
        default:
          return {
            ...operation,
            resolve: (input: any, extraOptions: ResolvingOptions | undefined) =>
              operation.resolve(input, {
                ...extraOptions,
                middlewares: composeMiddlewares(extraOptions, options),
              }),
          }
      }
    })()
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
