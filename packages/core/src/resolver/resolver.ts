import {
  type Middleware,
  applyMiddlewares,
  compose,
  getFieldOptions,
  getOperationOptions,
  getSubscriptionOptions,
} from "../utils"
import { FIELD_HIDDEN } from "../utils/symbols"
import { createInputParser, getStandardValue } from "./input"
import {
  FieldChainFactory,
  MutationChainFactory,
  QueryChainFactory,
  SubscriptionChainFactory,
} from "./resolver-chain-factory"
import type {
  FieldFactory,
  FieldFactoryWithUtils,
  FieldOrOperation,
  GraphQLSilkIO,
  MutationFactory,
  MutationFactoryWithChain,
  QueryFactory,
  QueryFactoryWithChain,
  ResolverFactory,
  ResolverOptionsWithParent,
  ResolvingOptions,
  Subscription,
  SubscriptionFactory,
  SubscriptionFactoryWithChain,
} from "./types"

export const createQuery: QueryFactory<GraphQLSilkIO> = (
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
        async () => options.resolve(getStandardValue(await parseInput())),
        { parseInput, parent: undefined, outputSilk: output, type }
      )
    },
    type,
  }
}

export const query: QueryFactoryWithChain<GraphQLSilkIO> = Object.assign(
  createQuery,
  QueryChainFactory.methods()
)

export const createMutation: MutationFactory<GraphQLSilkIO> = (
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
        async () => options.resolve(getStandardValue(await parseInput())),
        { parseInput, parent: undefined, outputSilk: output, type }
      )
    },
    type,
  }
}

export const mutation: MutationFactoryWithChain<GraphQLSilkIO> = Object.assign(
  createMutation,
  MutationChainFactory.methods()
)

export const createField: FieldFactory<GraphQLSilkIO> = (
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
        async () =>
          options.resolve(parent, getStandardValue(await parseInput())),
        { parseInput, parent, outputSilk: output, type }
      )
    },
    type,
  }
}

export const field: FieldFactoryWithUtils<GraphQLSilkIO> = Object.assign(
  createField,
  { hidden: FIELD_HIDDEN as typeof FIELD_HIDDEN },
  FieldChainFactory.methods()
)

export const defaultSubscriptionResolve = (source: any) => source

export const createSubscription: SubscriptionFactory<GraphQLSilkIO> = (
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
        async () => options.subscribe(getStandardValue(await parseInput())),
        { parseInput, parent: undefined, outputSilk: output, type }
      )
    },
    resolve: options.resolve ?? defaultSubscriptionResolve,
    type,
  }
}

export const subscription: SubscriptionFactoryWithChain<GraphQLSilkIO> =
  Object.assign(createSubscription, SubscriptionChainFactory.methods())

export const ResolverOptionsMap = new WeakMap<
  object,
  ResolverOptionsWithParent
>()

export function baseResolver(
  operations: Record<string, FieldOrOperation<any, any, any>>,
  options: ResolverOptionsWithParent | undefined
) {
  const record: Record<string, FieldOrOperation<any, any, any>> = {}

  Object.entries(operations).forEach(([name, operation]) => {
    record[name] = extraOperationOptions(operation, options)
  })

  if (options) ResolverOptionsMap.set(record, options)
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

  if (typeof operation === "symbol") return operation

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

export const resolver: ResolverFactory<GraphQLSilkIO> = Object.assign(
  baseResolver as ResolverFactory<GraphQLSilkIO>,
  {
    of: ((parent, operations, options) =>
      baseResolver(
        operations as Record<string, FieldOrOperation<any, any, any>>,
        { ...options, parent } as ResolverOptionsWithParent
      )) as ResolverFactory<GraphQLSilkIO>["of"],
  }
)

export const loom = {
  query,
  resolver,
  field,
  subscription,
  mutation,
}
