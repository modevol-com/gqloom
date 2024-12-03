import type { StandardSchemaV1 } from "@standard-schema/spec"
import type {
  CallableInputParser,
  FieldOrOperation,
  FieldOrOperationType,
  GenericFieldOrOperation,
  InferFieldOutput,
} from "../resolver"
import type { MayPromise } from "./types"

export interface MiddlewarePayload<
  TField extends GenericFieldOrOperation = FieldOrOperation<any, any, any, any>,
> {
  /** The Output Silk of the field */
  outputSilk: StandardSchemaV1.InferOutput<InferFieldOutput<TField>>

  /** The previous object, which for a field on the root Query type is often not used. */
  parent: TField extends FieldOrOperation<infer TParent, any, any, any>
    ? TParent extends undefined
      ? undefined
      : StandardSchemaV1.InferOutput<NonNullable<TParent>>
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
  next: () => MayPromise<
    StandardSchemaV1.InferOutput<InferFieldOutput<TField>>
  >,
  payload: MiddlewarePayload<TField>
) => MayPromise<StandardSchemaV1.InferOutput<InferFieldOutput<TField>>>

export function applyMiddlewares<
  TField extends GenericFieldOrOperation = FieldOrOperation<any, any, any, any>,
>(
  middlewares: Middleware[],
  resolveFunction: () => MayPromise<
    StandardSchemaV1.InferOutput<InferFieldOutput<TField>>
  >,
  payload: MiddlewarePayload<TField>
): Promise<StandardSchemaV1.InferOutput<InferFieldOutput<TField>>> {
  const next = (
    index: number
  ): MayPromise<StandardSchemaV1.InferOutput<InferFieldOutput<TField>>> => {
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
