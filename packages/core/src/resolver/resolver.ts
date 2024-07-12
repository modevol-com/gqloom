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
  FieldBobbin,
  QueryMutationBobbin,
  ResolvingOptions,
  ResolverBobbin,
  FieldOrOperation,
  ResolverOptionsWithParent,
  GraphQLSilkIO,
  SubscriptionBobbin,
  Subscription,
} from "./types"

export const silkQuery: QueryMutationBobbin<GraphQLSilkIO> = (
  output,
  resolveOrOptions
) => {
  const options = getOperationOptions(resolveOrOptions)
  const type = "query"
  return {
    ...getFieldOptions(options),
    input: options.input,
    output,
    resolve: (inputValue, extraOptions) => {
      const parseInput = createInputParser(options.input, inputValue)
      return applyMiddlewares(
        compose(extraOptions?.middlewares, options.middlewares),
        async () => options.resolve(await parseInput()),
        { parseInput, parent: undefined, outputSilk: output, type }
      )
    },
    type,
  }
}

export const silkMutation: QueryMutationBobbin<GraphQLSilkIO> = (
  output,
  resolveOrOptions
) => {
  const options = getOperationOptions(resolveOrOptions)
  const type = "mutation"
  return {
    ...getFieldOptions(options),
    input: options.input,
    output,
    resolve: (inputValue, extraOptions) => {
      const parseInput = createInputParser(options.input, inputValue)
      return applyMiddlewares(
        compose(extraOptions?.middlewares, options.middlewares),
        async () => options.resolve(await parseInput()),
        { parseInput, parent: undefined, outputSilk: output, type }
      )
    },
    type,
  }
}

export const silkField: FieldBobbin<GraphQLSilkIO> = (
  output,
  resolveOrOptions
) => {
  const options = getOperationOptions<"field">(resolveOrOptions)
  const type = "field"
  return {
    ...getFieldOptions(options),
    input: options.input,
    output,
    resolve: (parent, inputValue, extraOptions) => {
      const parseInput = createInputParser(options.input, inputValue)
      return applyMiddlewares(
        compose(extraOptions?.middlewares, options.middlewares),
        async () => options.resolve(parent, await parseInput()),
        { parseInput, parent, outputSilk: output, type }
      )
    },
    type,
  }
}

export const defaultSubscriptionResolve = (source: any) => source

export const silkSubscription: SubscriptionBobbin<GraphQLSilkIO> = (
  output,
  subscribeOrOptions
) => {
  const options = getSubscriptionOptions(subscribeOrOptions)
  const type = "subscription"
  return {
    ...getFieldOptions(options),
    input: options.input,
    output,
    subscribe: (inputValue, extraOptions) => {
      const parseInput = createInputParser(options.input, inputValue)
      return applyMiddlewares(
        compose<Middleware<any>>(
          extraOptions?.middlewares,
          options.middlewares
        ),
        async () => options.subscribe(await parseInput()),
        { parseInput, parent: undefined, outputSilk: output, type }
      )
    },
    resolve: options.resolve ?? defaultSubscriptionResolve,
    type,
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

export const silkResolver: ResolverBobbin<GraphQLSilkIO> = Object.assign(
  baseResolver as ResolverBobbin<GraphQLSilkIO>,
  {
    of: ((parent, operations, options) =>
      baseResolver(
        operations as Record<string, FieldOrOperation<any, any, any>>,
        { ...options, parent } as ResolverOptionsWithParent
      )) as ResolverBobbin<GraphQLSilkIO>["of"],
  }
)

export const loom = {
  query: silkQuery,
  resolver: silkResolver,
  field: silkField,
  subscription: silkSubscription,
  mutation: silkMutation,
}
