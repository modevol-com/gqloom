import type { MayPromise } from "@gqloom/core";
import type { Schema, InferType } from "yup";

interface FiledResolver<TParent, TOutput, TInput = undefined> {
	(parent: TParent, input: TInput): MayPromise<TOutput>;
	options: {
		input: TInput;
	};
}

interface OperationOptions<
	TOutputSchema extends Schema,
	TInputSchema extends Schema | undefined,
> {
	input?: TInputSchema;
	resolve: TInputSchema extends undefined
		? () => MayPromise<InferType<TOutputSchema>>
		: (
				input: InferType<NonNullable<TInputSchema>>,
		  ) => MayPromise<InferType<TOutputSchema>>;
}

interface OperationOptionsWithParent<
	TParent,
	TOutputSchema extends Schema,
	TInputSchema extends Schema | undefined,
> {
	input?: TInputSchema;
	resolve: TInputSchema extends undefined
		? (parent: TParent) => MayPromise<InferType<TOutputSchema>>
		: (
				parent: TParent,
				input: InferType<NonNullable<TInputSchema>>,
		  ) => MayPromise<InferType<TOutputSchema>>;
}

export function field<
	TParent,
	TOutputSchema extends Schema,
	TInputSchema extends Schema,
>(
	outputSchema: TOutputSchema,
	resolveOrOptions:
		| ((parent: TParent) => MayPromise<InferType<TOutputSchema>>)
		| OperationOptionsWithParent<TParent, TOutputSchema, TInputSchema>,
): FiledResolver<TParent, InferType<TOutputSchema>, InferType<TInputSchema>> {
	return 0 as any;
}

export function resolver<
	TParentSchema extends Schema,
	TEntries extends Record<
		string,
		FiledResolver<InferType<TParentSchema>, any, any>
	>,
>(parentSchema: TParentSchema, entries: TEntries) {}
