import { isType } from "graphql"
import type { MayPromise, ObjectOrNever } from "../utils"
import type { AnyGraphQLFabric } from "./fabric"
import type { InferSchemaI, InferSchemaO, AbstractSchemaIO } from "./types"

export type InputSchema<TBaseSchema> =
  | TBaseSchema
  | Record<string, TBaseSchema>
  | undefined

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
  inputSchema: InputSchema<AnyGraphQLFabric>,
  input: any
): MayPromise<any> {
  if (inputSchema === undefined) {
    return undefined
  }
  if (isFabric(inputSchema)) {
    if (typeof inputSchema.parse === "function") return inputSchema.parse(input)
    return input
  }

  return parseInputEntries(inputSchema, input)
}

async function parseInputEntries(
  inputSchema: Record<string, AnyGraphQLFabric>,
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

function isFabric(
  inputSchema: InputSchema<AnyGraphQLFabric>
): inputSchema is AnyGraphQLFabric {
  return isType(inputSchema?.type)
}
