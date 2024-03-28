import { getOperationOptions, applyMiddlewares } from "../utils"
import type { AnyGraphQLFabric } from "./fabric"
import type {
  FieldWeaver,
  OperationOptions,
  OperationWeaver,
  ResolvingOptions,
  ResolverWeaver,
  FieldOptions,
} from "./types"

export type GraphQLFabricIO = [
  object: AnyGraphQLFabric,
  input: "_types.input",
  output: "_types.output",
]

const notImplemented: any = 0

function resolveForOperation(
  options: OperationOptions<any, any, any>
): (input: any, options?: ResolvingOptions) => Promise<any> {
  return (input, resolvingOptions) => {
    const middlewares = [
      ...(resolvingOptions?.middlewares ?? []),
      ...(options.middlewares ?? []),
    ]
    return applyMiddlewares(middlewares, () => {
      // TODO: parse and memory input
      return options.resolve(input)
    })
  }
}

function resolveForField(
  options: FieldOptions<any, any, any, any>
): (parent: any, input: any, options?: ResolvingOptions) => Promise<any> {
  return (parent, input, resolvingOptions) => {
    const middlewares = [
      ...(resolvingOptions?.middlewares ?? []),
      ...(options.middlewares ?? []),
    ]
    return applyMiddlewares(middlewares, () => {
      // TODO: parse and memory input
      return options.resolve(parent, input)
    })
  }
}

export const fabricQuery: OperationWeaver<GraphQLFabricIO> = (
  output,
  resolveOrOptions
) => {
  const options = getOperationOptions(resolveOrOptions)
  return {
    input: options.input,
    output,
    resolve: resolveForOperation(options),
    type: "query",
  }
}

export const fabricMutation: OperationWeaver<GraphQLFabricIO> = (
  output,
  resolveOrOptions
) => {
  const options = getOperationOptions(resolveOrOptions)
  return {
    input: options.input,
    output,
    resolve: resolveForOperation(options),
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

export const fabricResolver: ResolverWeaver<GraphQLFabricIO> = notImplemented
