import {
  type Middleware,
  getOperationOptions,
  applyMiddlewares,
  compose,
  getSubscriptionOptions,
  getFieldOptions,
} from "../utils"
import { RESOLVER_OPTIONS_KEY } from "../utils/symbols"
import { createInputParser } from "./input"
import type {
  FieldShuttle,
  QueryMutationShuttle,
  ResolvingOptions,
  ResolverShuttle,
  FieldOrOperation,
  ResolverOptionsWithParent,
  GraphQLSilkIO,
  SubscriptionShuttle,
  Subscription,
} from "./types"

export const silkQuery: QueryMutationShuttle<GraphQLSilkIO> = (
  output,
  resolveOrOptions
) => {
  const options = getOperationOptions(resolveOrOptions)
  return {
    ...getFieldOptions(options),
    input: options.input,
    output,
    resolve: (inputValue, extraOptions) => {
      const parseInput = createInputParser(options.input, inputValue)
      return applyMiddlewares(
        compose(extraOptions?.middlewares, options.middlewares),
        async () => options.resolve(await parseInput()),
        { parseInput, parent: undefined }
      )
    },
    type: "query",
  }
}

export const silkMutation: QueryMutationShuttle<GraphQLSilkIO> = (
  output,
  resolveOrOptions
) => {
  const options = getOperationOptions(resolveOrOptions)
  return {
    ...getFieldOptions(options),
    input: options.input,
    output,
    resolve: (inputValue, extraOptions) => {
      const parseInput = createInputParser(options.input, inputValue)
      return applyMiddlewares(
        compose(extraOptions?.middlewares, options.middlewares),
        async () => options.resolve(await parseInput()),
        { parseInput, parent: undefined }
      )
    },
    type: "mutation",
  }
}

export const silkField: FieldShuttle<GraphQLSilkIO> = (
  output,
  resolveOrOptions
) => {
  const options = getOperationOptions<"field">(resolveOrOptions)
  return {
    ...getFieldOptions(options),
    input: options.input,
    output,
    resolve: (parent, inputValue, extraOptions) => {
      const parseInput = createInputParser(options.input, inputValue)
      return applyMiddlewares(
        compose(extraOptions?.middlewares, options.middlewares),
        async () => options.resolve(parent, await parseInput()),
        { parseInput, parent }
      )
    },
    type: "field",
  }
}

export const defaultSubscriptionResolve = (source: any) => source

export const silkSubscription: SubscriptionShuttle<GraphQLSilkIO> = (
  output,
  subscribeOrOptions
) => {
  const options = getSubscriptionOptions(subscribeOrOptions)
  return {
    ...getFieldOptions(options),
    input: options.input,
    output,
    subscribe: (inputValue, extraOptions) => {
      const parseInput = createInputParser(options.input, inputValue)
      return applyMiddlewares(
        compose(extraOptions?.middlewares, options.middlewares),
        async () => options.subscribe(await parseInput()),
        { parseInput, parent: undefined }
      )
    },
    resolve: options.resolve ?? defaultSubscriptionResolve,
    type: "subscription",
  }
}

export function baseResolver(
  operations: Record<string, FieldOrOperation<any, any, any>>,
  options: ResolverOptionsWithParent | undefined
) {
  const record: Record<string, FieldOrOperation<any, any, any>> & {
    [RESOLVER_OPTIONS_KEY]?: ResolverOptionsWithParent
  } = {
    [RESOLVER_OPTIONS_KEY]: options,
  }
  Object.defineProperty(record, RESOLVER_OPTIONS_KEY, {
    enumerable: false,
    configurable: true,
    writable: true,
    value: options,
  })

  Object.entries(operations).forEach(([name, operation]) => {
    record[name] = extraOperationOptions(operation, options)
  })

  return record
}

function extraOperationOptions<
  TOperation extends FieldOrOperation<any, any, any>,
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

export const silkResolver: ResolverShuttle<GraphQLSilkIO> = Object.assign(
  baseResolver as ResolverShuttle<GraphQLSilkIO>,
  {
    of: ((parent, operations, options) =>
      baseResolver(
        operations as Record<string, FieldOrOperation<any, any, any>>,
        { ...options, parent }
      )) as ResolverShuttle<GraphQLSilkIO>["of"],
  }
)

export const loom = {
  query: silkQuery,
  resolver: silkResolver,
  field: silkField,
  subscription: silkSubscription,
  mutation: silkMutation,
}
