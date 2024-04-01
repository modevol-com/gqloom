import type { MayPromise, ObjectOrNever } from "../utils"
import { isSilk } from "./silk"
import type {
  InferSchemaI,
  InferSchemaO,
  SchemaToSilk,
  AbstractSchemaIO,
  AnyGraphQLSilk,
} from "./types"

export const PARSE_RESULT_KEY = Symbol("parse result key")

export type InputSchema<TBaseSchema> =
  | TBaseSchema
  | Record<string, TBaseSchema>
  | undefined

export type InputSchemaToSilk<
  TSchemaIO extends AbstractSchemaIO,
  TInput extends InputSchema<TSchemaIO[0]>,
> = TInput extends undefined
  ? undefined
  : TInput extends TSchemaIO[0]
    ? SchemaToSilk<TSchemaIO, TInput>
    : {
        [K in keyof TInput]: TInput[K] extends TSchemaIO[0]
          ? SchemaToSilk<TSchemaIO, TInput[K]>
          : never
      }

export type InferInputI<
  TInput extends object | undefined,
  TSchemaIO extends AbstractSchemaIO,
> = TInput extends undefined
  ? undefined
  : TInput extends TSchemaIO[0]
    ? ObjectOrNever<InferSchemaI<TInput, TSchemaIO>>
    : {
        [K in keyof TInput]: InferSchemaI<TInput[K], TSchemaIO>
      }

export type InferInputO<
  TInput extends object | undefined,
  TSchemaIO extends AbstractSchemaIO,
> = TInput extends undefined
  ? undefined
  : TInput extends TSchemaIO[0]
    ? ObjectOrNever<InferSchemaO<TInput, TSchemaIO>>
    : {
        [K in keyof TInput]: InferSchemaO<TInput[K], TSchemaIO>
      }

export function parseInput(
  inputSchema: InputSchema<AnyGraphQLSilk>,
  input: any
): MayPromise<any> {
  if (inputSchema === undefined) {
    return undefined
  }

  if (typeof input === "object" && PARSE_RESULT_KEY in input) {
    // use cached result
    return input[PARSE_RESULT_KEY]
  }

  if (isSilk(inputSchema)) {
    if (typeof inputSchema.parse === "function") {
      return keepResult(input, inputSchema.parse(input))
    }
    return keepResult(input, input)
  }

  return keepResult(input, parseInputEntries(inputSchema, input))
}

async function parseInputEntries(
  inputSchema: Record<string, AnyGraphQLSilk>,
  input: any = {}
): Promise<Record<string, any>> {
  const result: Record<string, any> = {}
  await Promise.all(
    Object.entries(inputSchema).map(async ([key, value]) => {
      if (typeof value.parse === "function") {
        result[key] = await value.parse(input[key])
      } else {
        result[key] = input[key]
      }
    })
  )
  return result
}

export function keepResult<T extends object>(
  input: T,
  result: any
): T & { [PARSE_RESULT_KEY]: any } {
  if (typeof input !== "object") return result
  Object.defineProperty(input, PARSE_RESULT_KEY, {
    value: result,
    enumerable: false,
    configurable: true,
    writable: true,
  })
  return result
}

export function clearResultProperty<T extends object>(
  input: T
): T extends { [PARSE_RESULT_KEY]?: any }
  ? Omit<T, typeof PARSE_RESULT_KEY>
  : T {
  delete (input as any)[PARSE_RESULT_KEY]
  return input as any
}
