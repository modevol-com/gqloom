import {
  type GenericFieldOrOperation,
  type CallableInputParser,
  type FieldOrOperation,
  type InferFieldOutput,
  type InferSilkO,
  type FieldOrOperationType,
} from "../resolver"
import type { MayPromise } from "./types"

export interface MiddlewarePayload<
  TField extends GenericFieldOrOperation = FieldOrOperation<any, any, any, any>,
> {
  /** The Output Silk of the field */
  outputSilk: InferSilkO<InferFieldOutput<TField>>

  /** The previous object, which for a field on the root Query type is often not used. */
  parent: TField extends FieldOrOperation<infer TParent, any, any, any>
    ? TParent extends undefined
      ? undefined
      : InferSilkO<NonNullable<TParent>>
    : never

  /** A function to parse the input of the field */
  parseInput: TField extends FieldOrOperation<any, any, infer TInput, any>
    ? CallableInputParser<TInput>
    : undefined

  /** The type of the field: `query`, `mutation`, `subscription` or `field` */
  type: FieldOrOperationType
}

export type Middleware<
  TField extends GenericFieldOrOperation = FieldOrOperation<any, any, any, any>,
> = (
  next: () => MayPromise<InferSilkO<InferFieldOutput<TField>>>,
  payload: MiddlewarePayload<TField>
) => MayPromise<InferSilkO<InferFieldOutput<TField>>>

export function applyMiddlewares<
  TField extends GenericFieldOrOperation = FieldOrOperation<any, any, any, any>,
>(
  middlewares: Middleware[],
  resolveFunction: () => MayPromise<InferSilkO<InferFieldOutput<TField>>>,
  payload: MiddlewarePayload<TField>
): Promise<InferSilkO<InferFieldOutput<TField>>> {
  const next = (
    index: number
  ): MayPromise<InferSilkO<InferFieldOutput<TField>>> => {
    if (index >= middlewares.length) {
      return resolveFunction()
    }
    const middleware = middlewares[index]
    return middleware(() => next(index + 1), payload)
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
