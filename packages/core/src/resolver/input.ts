import type { StandardSchemaV1 } from "@standard-schema/spec"
import { GraphQLError } from "graphql"
import type { MayPromise, ObjectOrNever } from "../utils"
import { isSilk } from "./silk"
import type {
  AbstractSchemaIO,
  GraphQLSilk,
  GraphQLSilkIO,
  InferSchemaI,
  InferSchemaO,
  SchemaToSilk,
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
  (): Promise<StandardSchemaV1.Result<InferInputO<TSchema, GraphQLSilkIO>>>

  /**
   * Result of parsing. Set it to `undefined` then the parser will run again.
   */
  result:
    | StandardSchemaV1.Result<InferInputO<TSchema, GraphQLSilkIO>>
    | undefined
}

export function createInputParser<
  TSchema extends InputSchema<GraphQLSilk> | undefined,
>(
  schema: TSchema,
  value: InferInputI<TSchema, GraphQLSilkIO>
): CallableInputParser<TSchema> {
  let result:
    | StandardSchemaV1.Result<InferInputO<TSchema, GraphQLSilkIO>>
    | undefined

  const parse = async () => {
    if (result !== undefined) return result
    result = await parseInputValue(schema, value)
    return result
  }

  Object.assign(parse, { schema, value })
  Object.defineProperty(parse, "result", {
    get: () => result,
    set: (value) => (result = value),
  })

  return parse as unknown as CallableInputParser<TSchema>
}

export function parseInputValue<
  TSchema extends InputSchema<GraphQLSilk> | undefined,
>(
  inputSchema: TSchema,
  input: any
): MayPromise<StandardSchemaV1.Result<InferInputO<TSchema, GraphQLSilkIO>>> {
  if (inputSchema === undefined) {
    return { value: input } as StandardSchemaV1.Result<
      InferInputO<TSchema, GraphQLSilkIO>
    >
  }

  if (isSilk(inputSchema)) {
    return inputSchema["~standard"].validate(input)
  }

  return parseInputEntries(inputSchema, input) as InferInputO<
    TSchema,
    GraphQLSilkIO
  >
}

async function parseInputEntries(
  inputSchema: Record<string, GraphQLSilk>,
  input: any = {}
): Promise<StandardSchemaV1.Result<Record<string, any>>> {
  const result: Record<string, any> = {}
  const issues: StandardSchemaV1.Issue[] = []

  await Promise.all(
    Object.entries(inputSchema).map(async ([key, value]) => {
      const res = await value["~standard"].validate(input[key])
      if ("value" in res) {
        result[key] = res.value
      }
      if (res.issues) {
        issues.push(...res.issues.slice())
      }
    })
  )
  return { value: result, ...(issues.length > 0 ? { issues } : null) }
}

export function getStandardValue<T>(result: StandardSchemaV1.Result<T>): T
export function getStandardValue<T>(
  result?: StandardSchemaV1.Result<T>
): T | undefined
export function getStandardValue<T>(
  result: StandardSchemaV1.Result<T> | null
): T | null
export function getStandardValue<T>(
  result?: StandardSchemaV1.Result<T> | null
): T | null | undefined {
  if (result == null) return result
  const { issues } = result
  if (issues?.length) {
    throw new GraphQLError(issues?.[0]?.message ?? "Invalid input", {
      extensions: { issues },
    })
  }

  if ("value" in result) return result.value
  else throw new GraphQLError("Invalid input")
}
