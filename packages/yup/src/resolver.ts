import type { MayPromise } from "@gqloom/core"
import type { InferType, Schema } from "yup"

type InputEntries = Record<string, Schema>

type InferInputEntries<T extends InputEntries> = {
	[K in keyof T]: InferType<T[K]>
}

interface OperationOptions<
	TOutput extends Schema,
	TInput extends InputEntries | undefined,
> {
	input?: TInput
	resolve: (
		input: TInput extends undefined
			? undefined
			: InferInputEntries<NonNullable<TInput>>,
	) => MayPromise<InferType<TOutput>>
}

interface OperationOptionsWithParent<
	TParent extends Schema,
	TOutput extends Schema,
	TInput extends InputEntries | undefined,
> {
	input?: TInput
	resolve: (
		parent: InferType<TParent>,
		input: TInput extends undefined
			? undefined
			: InferInputEntries<NonNullable<TInput>>,
	) => MayPromise<InferType<TOutput>>
}

interface Operation<
	TParent extends Schema,
	TOutput extends Schema,
	TInput extends InputEntries | undefined = undefined,
> {
	(parent: TParent, input: TInput): MayPromise<TOutput>
	options: {
		input: TInput
	}
}

export function field<
	TParent extends Schema,
	TOutput extends Schema,
	TInput extends InputEntries | undefined = undefined,
>(
	outputSchema: TOutput,
	resolveOrOptions:
		| ((parent: TParent) => MayPromise<InferType<TOutput>>)
		| OperationOptionsWithParent<TParent, TOutput, TInput>,
): Operation<
	TParent,
	InferType<TOutput>,
	TInput extends undefined ? undefined : InferInputEntries<NonNullable<TInput>>
> {
	return 0 as any
}

export function query<
	TOutput extends Schema,
	TInput extends InputEntries | undefined = undefined,
>(
	outputSchema: TOutput,
	resolveOrOptions:
		| (() => MayPromise<InferType<TOutput>>)
		| OperationOptions<TOutput, TInput>,
): Operation<any, InferType<TOutput>, TInput> {
	return 0 as any
}

export function mutation<
	TOutput extends Schema,
	TInput extends InputEntries | undefined = undefined,
>(
	outputSchema: TOutput,
	resolveOrOptions:
		| (() => MayPromise<InferType<TOutput>>)
		| OperationOptions<TOutput, TInput>,
): Operation<any, InferType<TOutput>, TInput> {
	return 0 as any
}

export function resolver<
	TParentSchema extends Schema,
	TEntries extends Record<string, Operation<TParentSchema, any, any>>,
>(parentSchema: TParentSchema, entries: TEntries) {}
