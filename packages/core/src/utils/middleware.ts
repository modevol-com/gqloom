import type { StandardSchemaV1 } from "@standard-schema/spec"
import type {
  CallableInputParser,
  InferFieldOutput,
  Loom,
  ResolverPayload,
} from "../resolver"
import type { MayPromise, RequireKeys } from "./types"

/**
 * The operation of the field:
 * - `field`
 * - `query`
 * - `mutation`
 * - `subscription.resolve`
 * - `subscription.subscribe`
 * - `resolveReference`
 */
export type MiddlewareOperation =
  | "field"
  | "query"
  | "mutation"
  | "subscription.resolve"
  | "subscription.subscribe"
  | "resolveReference"

export interface MiddlewareOptions<
  TField extends Loom.BaseField = Loom.BaseField,
> {
  /** The Output Silk */
  outputSilk: StandardSchemaV1.InferOutput<InferFieldOutput<TField>>

  /** The previous object. */
  parent: InferFieldParent<TField>

  /** A function to parse the input */
  parseInput: CallableInputParser<TField["~meta"]["input"]>

  /** The executing operation */
  operation: MiddlewareOperation

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

export interface MiddlewareConfig {
  /** The operations to apply the middleware to. */
  operations?: MiddlewareOperation[]
}

export interface Middleware<TField extends Loom.BaseField = any>
  extends Partial<MiddlewareConfig> {
  (
    options: CallableMiddlewareOptions<TField>
  ): MayPromise<StandardSchemaV1.InferOutput<InferFieldOutput<TField>>>
}

const defaultOperations: MiddlewareOperation[] = [
  "field",
  "mutation",
  "query",
  "subscription.subscribe",
]

export function applyMiddlewares<
  TField extends Loom.BaseField = Loom.BaseField,
>(
  options: MiddlewareOptions<TField>,
  resolveFunction: () => MayPromise<
    StandardSchemaV1.InferOutput<InferFieldOutput<TField>>
  >,
  middlewares: Middleware[]
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

export function filterMiddlewares(
  operation: MiddlewareOperation,
  ...middlewareList: (Middleware | Iterable<Middleware> | undefined | null)[]
): Middleware[] {
  return middlewareList.reduce<Middleware[]>((acc, m) => {
    if (!m) return acc
    acc.push(
      ...ensureArray(m).filter((m) => {
        const ops = m.operations ?? defaultOperations
        return ops.includes(operation)
      })
    )
    return acc
  }, [])
}

function ensureArray<T>(value: T | Iterable<T>): T[] {
  if (value != null && typeof value === "object" && Symbol.iterator in value) {
    return Array.from(value)
  }
  return [value]
}
