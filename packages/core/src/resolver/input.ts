import { SYMBOLS } from "../utils"
import type { MayPromise, ObjectOrNever } from "../utils"
import { isSilk } from "./silk"
import type {
  InferSchemaI,
  InferSchemaO,
  SchemaToSilk,
  AbstractSchemaIO,
  GraphQLSilk,
  GraphQLSilkIO,
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

export interface CallableInputParser<TSchema extends InputSchema<GraphQLSilk>> {
  /**
   * input schema
   */
  schema: TSchema

  /**
   *  Origin value to parse
   */
  value: InferInputI<TSchema, GraphQLSilkIO>

  /**
   * Parse the input and return the
   */
  (): Promise<InferInputO<TSchema, GraphQLSilkIO>>

  /**
   * Result of parsing. Set it to `undefined` then the parser will run again.
   */
  result: InferInputO<TSchema, GraphQLSilkIO> | undefined
}

export function createInputParser<TSchema extends InputSchema<GraphQLSilk>>(
  schema: TSchema,
  value: InferInputI<TSchema, GraphQLSilkIO>
): CallableInputParser<TSchema> {
  let result: InferInputO<TSchema, GraphQLSilkIO> | undefined

  const parse = async () => {
    if (result !== undefined) return result
    result = await parseInputValue(schema, value)
    return result as InferInputO<TSchema, GraphQLSilkIO>
  }

  Object.assign(parse, { schema, value })
  Object.defineProperty(parse, "result", {
    get: () => result,
    set: (value) => (result = value),
  })

  return parse as CallableInputParser<TSchema>
}

export function parseInputValue<
  TSchema extends InputSchema<GraphQLSilk> | undefined,
>(
  inputSchema: TSchema,
  input: any
): MayPromise<InferInputO<TSchema, GraphQLSilkIO>> {
  if (inputSchema === undefined) {
    return undefined as InferInputO<TSchema, GraphQLSilkIO>
  }

  if (isSilk(inputSchema)) {
    if (typeof inputSchema[SYMBOLS.PARSE] === "function") {
      return inputSchema[SYMBOLS.PARSE](input)
    }
    return input
  }

  return parseInputEntries(inputSchema, input) as InferInputO<
    TSchema,
    GraphQLSilkIO
  >
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
