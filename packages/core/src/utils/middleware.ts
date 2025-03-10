import type { StandardSchemaV1 } from "@standard-schema/spec"
import type {
  CallableInputParser,
  GraphQLSilk,
  InferFieldOutput,
  Loom,
} from "../resolver"
import type { MayPromise } from "./types"

export interface MiddlewareOptions<
  TField extends Loom.BaseField = Loom.BaseField,
> {
  /** The Output Silk of the field */
  outputSilk: StandardSchemaV1.InferOutput<InferFieldOutput<TField>>

  /** The previous object, which for a field on the root Query type is often not used. */
  parent: TField extends Loom.Field<
    GraphQLSilk,
    GraphQLSilk,
    GraphQLSilk | Record<string, GraphQLSilk> | undefined
  >
    ? StandardSchemaV1.InferOutput<
        NonNullable<TField["~meta"]["types"]>["parent"]
      >
    : undefined

  /** A function to parse the input of the field */
  parseInput: CallableInputParser<TField["~meta"]["input"]>

  /** The operation of the field: `query`, `mutation`, `subscription` or `field` */
  operation: Loom.BaseField["~meta"]["operation"]
}

export interface CallableMiddlewareOptions<
  TField extends Loom.BaseField = Loom.BaseField,
> extends MiddlewareOptions<TField> {
  /** The function to call next in the middleware chain. */
  next: () => MayPromise<StandardSchemaV1.InferOutput<InferFieldOutput<TField>>>

  /** The function to call next in the middleware chain. */
  (): MayPromise<StandardSchemaV1.InferOutput<InferFieldOutput<TField>>>
}

export type Middleware<TField extends Loom.BaseField = any> = (
  options: CallableMiddlewareOptions<TField>
) => MayPromise<StandardSchemaV1.InferOutput<InferFieldOutput<TField>>>

export function applyMiddlewares<
  TField extends Loom.BaseField = Loom.BaseField,
>(
  middlewares: Middleware[],
  resolveFunction: () => MayPromise<
    StandardSchemaV1.InferOutput<InferFieldOutput<TField>>
  >,
  options: MiddlewareOptions<TField>
): Promise<StandardSchemaV1.InferOutput<InferFieldOutput<TField>>> {
  const next = (
    index: number
  ): MayPromise<StandardSchemaV1.InferOutput<InferFieldOutput<TField>>> => {
    if (index >= middlewares.length) {
      return resolveFunction()
    }
    const middleware = middlewares[index]
    const callableOptions = Object.assign(() => next(index + 1), {
      ...options,
      next: () => next(index + 1),
    })
    return middleware(callableOptions)
  }
  return next(0)
}

export function compose<T>(...lists: (T[] | undefined)[]): T[] {
  const list: T[] = []
  for (const item of lists) {
    if (item != null) {
      list.push(...item)
    }
  }
  return list
}
