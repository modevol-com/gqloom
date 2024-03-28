import type { ObjectOrNever } from "../utils"
import type { InferSchemaI, InferSchemaO, AbstractSchemaIO } from "./types"

export type InputEntries<TBaseSchema> =
  | TBaseSchema
  | Record<string, TBaseSchema>
  | undefined

export type InferInputEntriesI<
  TInputEntries extends object | undefined,
  TSchemaIO extends AbstractSchemaIO,
> = TInputEntries extends undefined
  ? undefined
  : TInputEntries extends TSchemaIO[0]
    ? ObjectOrNever<InferSchemaI<TInputEntries, TSchemaIO>>
    : {
        [K in keyof TInputEntries]: InferSchemaI<TInputEntries[K], TSchemaIO>
      }

export type InferInputEntriesO<
  TInputEntries extends object | undefined,
  TSchemaIO extends AbstractSchemaIO,
> = TInputEntries extends undefined
  ? undefined
  : TInputEntries extends TSchemaIO[0]
    ? ObjectOrNever<InferSchemaO<TInputEntries, TSchemaIO>>
    : {
        [K in keyof TInputEntries]: InferSchemaO<TInputEntries[K], TSchemaIO>
      }
