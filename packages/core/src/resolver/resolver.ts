import {
  type MayPromise,
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
  FieldOptions,
  FieldOrOperation,
  GraphQLSilk,
  GraphQLSilkIO,
  MutationFactory,
  MutationFactoryWithChain,
  QueryFactory,
  QueryFactoryWithChain,
  QueryMutationOptions,
  ResolverFactory,
  ResolverOptionsWithParent,
  ResolvingOptions,
  Subscription,
  SubscriptionFactory,
  SubscriptionFactoryWithChain,
  SubscriptionOptions,
} from "./types"

export const createQuery = (
  output: GraphQLSilk<any, any>,
  resolveOrOptions?:
    | (() => MayPromise<unknown>)
    | QueryMutationOptions<GraphQLSilkIO, any, any>
) => {
  if (resolveOrOptions == null) {
    return new QueryChainFactory({ output })
  }

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
  } as FieldOrOperation<any, any, any, "query">
}

export const query: QueryFactoryWithChain<GraphQLSilkIO> = Object.assign(
  createQuery as QueryFactory<GraphQLSilkIO>,
  QueryChainFactory.methods()
)

export const createMutation = (
  output: GraphQLSilk<any, any>,
  resolveOrOptions?:
    | (() => MayPromise<unknown>)
    | QueryMutationOptions<GraphQLSilkIO, any, any>
) => {
  if (resolveOrOptions == null) {
    return new MutationChainFactory({ output })
  }

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
  } as FieldOrOperation<any, any, any, "mutation">
}

export const mutation: MutationFactoryWithChain<GraphQLSilkIO> = Object.assign(
  createMutation as MutationFactory<GraphQLSilkIO>,
  MutationChainFactory.methods()
)

export const createField = (
  output: GraphQLSilk<any, any>,
  resolveOrOptions?:
    | ((parent: unknown) => unknown)
    | FieldOptions<GraphQLSilkIO, any, any, any>
) => {
  if (resolveOrOptions == null) {
    return new FieldChainFactory({ output })
  }
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
  } as FieldOrOperation<any, any, any, "field">
}

export const field: FieldFactoryWithUtils<GraphQLSilkIO> = Object.assign(
  createField as FieldFactory<GraphQLSilkIO>,
  { hidden: FIELD_HIDDEN as typeof FIELD_HIDDEN },
  FieldChainFactory.methods()
)

export const defaultSubscriptionResolve = (source: any) => source

export const createSubscription = (
  output: GraphQLSilk<any, any>,
  subscribeOrOptions?:
    | (() => MayPromise<AsyncIterator<unknown>>)
    | SubscriptionOptions<GraphQLSilkIO, any, any, any>
) => {
  if (subscribeOrOptions == null) {
    return new SubscriptionChainFactory({ output })
  }

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
  } as Subscription<any, any, any>
}

export const subscription: SubscriptionFactoryWithChain<GraphQLSilkIO> =
  Object.assign(
    createSubscription as SubscriptionFactory<GraphQLSilkIO>,
    SubscriptionChainFactory.methods()
  )

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
