import type { StandardSchemaV1 } from "@standard-schema/spec"
import type {
  CallableInputParser,
  InferFieldOutput,
  Loom,
  ResolverPayload,
} from "../resolver"
import type { MayPromise, RequireKeys } from "./types"

export interface MiddlewareOptions<
  TField extends Loom.BaseField = Loom.BaseField,
> {
  /** The Output Silk of the field */
  outputSilk: StandardSchemaV1.InferOutput<InferFieldOutput<TField>>

  /** The previous object, which for a field on the root Query type is often not used. */
  parent: InferFieldParent<TField>

  /** A function to parse the input of the field */
  parseInput: CallableInputParser<TField["~meta"]["input"]>

  /** The operation of the field: `query`, `mutation`, `subscription` or `field` */
  operation: Loom.BaseField["~meta"]["operation"]

  /** The payload of the resolver */
  payload: ResolverPayload | undefined
}

type InferFieldParent<TField extends Loom.BaseField> =
  TField extends Loom.Field<infer TParent, any, any, infer TDependencies>
    ? TDependencies extends string[]
      ? RequireKeys<
          NonNullable<StandardSchemaV1.InferOutput<TParent>>,
          TDependencies[number]
        >
      : NonNullable<StandardSchemaV1.InferOutput<TParent>>
    : undefined

export interface CallableMiddlewareOptions<
  TField extends Loom.BaseField = Loom.BaseField,
> extends MiddlewareOptions<TField> {
  /** The function to call next in the middleware chain. */
  next: () => MayPromise<StandardSchemaV1.InferOutput<InferFieldOutput<TField>>>

  /** The function to call next in the middleware chain. */
  (): MayPromise<StandardSchemaV1.InferOutput<InferFieldOutput<TField>>>
}

export interface Middleware<TField extends Loom.BaseField = any> {
  (
    options: CallableMiddlewareOptions<TField>
  ): MayPromise<StandardSchemaV1.InferOutput<InferFieldOutput<TField>>>
}

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
