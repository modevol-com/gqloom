import type { MayPromise } from "@gqloom/core";
import type { Schema, InferType } from "yup";

type InputEntries = Record<string, Schema>;

type InferInputEntries<T extends InputEntries> = {
	[K in keyof T]: InferType<T[K]>;
};

interface OperationOptions<
	TOutputSchema extends Schema,
	TInputSchema extends InputEntries | undefined,
> {
	input?: TInputSchema;
	resolve: (
		input: TInputSchema extends undefined
			? undefined
			: InferInputEntries<NonNullable<TInputSchema>>,
	) => MayPromise<InferType<TOutputSchema>>;
}

interface OperationOptionsWithParent<
	TParent,
	TOutputSchema extends Schema,
	TInputSchema extends InputEntries | undefined,
> {
	input?: TInputSchema;
	resolve: (
		parent: TParent,
		input: TInputSchema extends undefined
			? undefined
			: InferInputEntries<NonNullable<TInputSchema>>,
	) => MayPromise<InferType<TOutputSchema>>;
}

interface Operation<TParent, TOutput, TInput = undefined> {
	(parent: TParent, input: TInput): MayPromise<TOutput>;
	options: {
		input: TInput;
	};
}

export function field<
	TParent,
	TOutputSchema extends Schema,
	TInputSchema extends InputEntries | undefined = undefined,
>(
	outputSchema: TOutputSchema,
	resolveOrOptions:
		| ((parent: TParent) => MayPromise<InferType<TOutputSchema>>)
		| OperationOptionsWithParent<TParent, TOutputSchema, TInputSchema>,
): Operation<
	TParent,
	InferType<TOutputSchema>,
	TInputSchema extends undefined
		? undefined
		: InferInputEntries<NonNullable<TInputSchema>>
> {
	return 0 as any;
}

export function query<
	TOutputSchema extends Schema,
	TInputSchema extends InputEntries | undefined = undefined,
>(
	outputSchema: TOutputSchema,
	resolveOrOptions:
		| (() => MayPromise<InferType<TOutputSchema>>)
		| OperationOptions<TOutputSchema, TInputSchema>,
): Operation<any, InferType<TOutputSchema>, TInputSchema> {
	return 0 as any;
}

export function mutation<
	TOutputSchema extends Schema,
	TInputSchema extends InputEntries | undefined = undefined,
>(
	outputSchema: TOutputSchema,
	resolveOrOptions:
		| (() => MayPromise<InferType<TOutputSchema>>)
		| OperationOptions<TOutputSchema, TInputSchema>,
): Operation<any, InferType<TOutputSchema>, TInputSchema> {
	return 0 as any;
}

export function resolver<
	TParentSchema extends Schema,
	TEntries extends Record<
		string,
		Operation<InferType<TParentSchema>, any, any>
	>,
>(parentSchema: TParentSchema, entries: TEntries) {}
