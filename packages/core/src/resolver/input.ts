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
  : {
      [K in keyof TInputEntries]: InferSchemaI<TInputEntries[K], TSchemaIO>
    }

export type InferInputEntriesO<
  TInputEntries extends object | undefined,
  TSchemaIO extends AbstractSchemaIO,
> = TInputEntries extends undefined
  ? undefined
  : {
      [K in keyof TInputEntries]: InferSchemaO<TInputEntries[K], TSchemaIO>
    }
