import {
  type GenericFieldOrOperation,
  type CallableInputParser,
  type FieldOrOperation,
  type InferFieldOutput,
  type InferSilkO,
} from "../resolver"
import type { MayPromise } from "./types"

export interface MiddlewarePayload<
  TField extends GenericFieldOrOperation = GenericFieldOrOperation,
> {
  outputSilk: InferSilkO<InferFieldOutput<TField>>

  parent: TField extends FieldOrOperation<infer TParent, any, any, any>
    ? TParent extends undefined
      ? undefined
      : InferSilkO<NonNullable<TParent>>
    : never

  parseInput: TField extends FieldOrOperation<any, any, infer TInput, any>
    ? CallableInputParser<TInput>
    : undefined
}

export type Middleware<
  TField extends GenericFieldOrOperation = GenericFieldOrOperation,
> = (
  next: () => MayPromise<InferSilkO<InferFieldOutput<TField>>>,
  payload: MiddlewarePayload<TField>
) => MayPromise<InferSilkO<InferFieldOutput<TField>>>

export function applyMiddlewares<
  TField extends GenericFieldOrOperation = GenericFieldOrOperation,
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
