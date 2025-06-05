import type { StandardSchemaV1 } from "@standard-schema/spec"
import { GraphQLError } from "graphql"
import type { MayPromise } from "../utils"
import { isSilk } from "./silk"
import type { GraphQLSilk } from "./types"

export type InferInputI<
  TInput extends GraphQLSilk | Record<string, GraphQLSilk> | void,
> = TInput extends void
  ? void
  : TInput extends GraphQLSilk
    ? StandardSchemaV1.InferInput<TInput>
    : TInput extends Record<string, GraphQLSilk>
      ? {
          [K in keyof TInput]: StandardSchemaV1.InferInput<TInput[K]>
        }
      : void

export type InferInputO<
  TInput extends GraphQLSilk | Record<string, GraphQLSilk> | void,
> = TInput extends void
  ? void
  : TInput extends GraphQLSilk
    ? StandardSchemaV1.InferOutput<TInput>
    : TInput extends Record<string, GraphQLSilk>
      ? {
          [K in keyof TInput]: StandardSchemaV1.InferOutput<TInput[K]>
        }
      : never

export interface CallableInputParser<
  TSchema extends GraphQLSilk | Record<string, GraphQLSilk> | void,
> {
  /**
   * input schema
   */
  schema: TSchema

  /**
   *  Origin value to parse
   */
  value: InferInputI<TSchema>

  /**
   * Parse the input and return the standard result
   */
  (): Promise<StandardSchemaV1.Result<InferInputO<TSchema>>>

  /**
   * Result of parsing. Set it to `undefined` then the parser will run again.
   */
  result: StandardSchemaV1.Result<InferInputO<TSchema>> | undefined

  /**
   * Parse the input and return the result
   */
  getResult(): Promise<InferInputO<TSchema>>

  /**
   * Set the result's value of parsing
   */
  setResult(value: InferInputO<TSchema>): void

  /**
   * Clear the result of parsing, the parser will run again to get the result.
   */
  clearResult(): void
}

export function createInputParser<
  TSchema extends GraphQLSilk | Record<string, GraphQLSilk> | void,
>(schema: TSchema, value: InferInputI<TSchema>): CallableInputParser<TSchema> {
  let result: StandardSchemaV1.Result<InferInputO<TSchema>> | undefined

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
  Object.defineProperty(parse, "getResult", {
    value: async () => getStandardValue(await parse()),
  })
  Object.defineProperty(parse, "setResult", {
    value: (value: InferInputO<TSchema>) => (result = { value }),
  })
  Object.defineProperty(parse, "clearResult", {
    value: () => (result = undefined),
  })

  return parse as unknown as CallableInputParser<TSchema>
}

export function parseInputValue<
  TSchema extends GraphQLSilk | Record<string, GraphQLSilk> | void,
>(
  inputSchema: TSchema,
  input: any
): MayPromise<StandardSchemaV1.Result<InferInputO<TSchema>>> {
  if (inputSchema === undefined) {
    return { value: input } as StandardSchemaV1.Result<InferInputO<TSchema>>
  }

  if (isSilk(inputSchema)) {
    return inputSchema["~standard"].validate(input)
  }

  return parseInputEntries(inputSchema, input) as InferInputO<TSchema>
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
