import { SYMBOLS } from "."
import type { MayPromise, ObjectOrNever } from "../utils"
import { isSilk } from "./silk"
import type {
  InferSchemaI,
  InferSchemaO,
  SchemaToSilk,
  AbstractSchemaIO,
  GraphQLSilk,
} from "./types"

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
  inputSchema: InputSchema<GraphQLSilk>,
  input: any
): MayPromise<any> {
  if (inputSchema === undefined) {
    return undefined
  }

  if (isSilk(inputSchema)) {
    if (typeof inputSchema[SYMBOLS.PARSE] === "function") {
      return inputSchema[SYMBOLS.PARSE](input)
    }
    return input
  }

  return parseInputEntries(inputSchema, input)
}

async function parseInputEntries(
  inputSchema: Record<string, GraphQLSilk>,
  input: any = {}
): Promise<Record<string, any>> {
  const result: Record<string, any> = {}
  await Promise.all(
    Object.entries(inputSchema).map(async ([key, value]) => {
      if (typeof value[SYMBOLS.PARSE] === "function") {
        result[key] = await value[SYMBOLS.PARSE](input[key])
      } else {
        result[key] = input[key]
      }
    })
  )
  return result
}
