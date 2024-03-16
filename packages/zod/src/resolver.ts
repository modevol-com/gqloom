import type { MayPromise } from "@gqloom/core";
import type { ZodType, input, output } from "zod";

type InputEntries = Record<string, ZodType<any, any, any>>;

type InferInputEntries<T extends InputEntries> = {
	[K in keyof T]: output<T[K]>;
};

interface OperationOptions<
	TOutput extends ZodType<any, any, any>,
	TInput extends InputEntries | undefined,
> {
	input?: TInput;
	resolve: (
		input: TInput extends undefined
			? undefined
			: InferInputEntries<NonNullable<TInput>>,
	) => MayPromise<output<TOutput>>;
}

interface OperationOptionsWithParent<
	TParent extends ZodType<any, any, any>,
	TOutput extends ZodType<any, any, any>,
	TInput extends InputEntries | undefined,
> {
	input?: TInput;
	resolve: (
		parent: output<TParent>,
		input: TInput extends undefined
			? undefined
			: InferInputEntries<NonNullable<TInput>>,
	) => MayPromise<output<TOutput>>;
}

interface Operation<
	TParent extends ZodType<any, any, any>,
	TOutput extends ZodType<any, any, any>,
	TInput extends InputEntries | undefined = undefined,
> {
	(parent: TParent, input: TInput): MayPromise<TOutput>;
	options: {
		input: TInput;
	};
}

export function field<
	TParent extends ZodType<any, any, any>,
	TOutput extends ZodType<any, any, any>,
	TInput extends InputEntries | undefined = undefined,
>(
	outputSchema: TOutput,
	resolveOrOptions:
		| ((parent: TParent) => MayPromise<output<TOutput>>)
		| OperationOptionsWithParent<TParent, TOutput, TInput>,
): Operation<
	TParent,
	output<TOutput>,
	TInput extends undefined ? undefined : InferInputEntries<NonNullable<TInput>>
> {
	return 0 as any;
}

export function query<
	TOutput extends ZodType<any, any, any>,
	TInput extends InputEntries | undefined = undefined,
>(
	outputSchema: TOutput,
	resolveOrOptions:
		| (() => MayPromise<output<TOutput>>)
		| OperationOptions<TOutput, TInput>,
): Operation<
	any,
	output<TOutput>,
	TInput extends undefined ? undefined : InferInputEntries<NonNullable<TInput>>
> {
	return 0 as any;
}

export function mutation<
	TOutput extends ZodType<any, any, any>,
	TInput extends InputEntries | undefined = undefined,
>(
	outputSchema: TOutput,
	resolveOrOptions:
		| (() => MayPromise<output<TOutput>>)
		| OperationOptions<TOutput, TInput>,
): Operation<
	any,
	output<TOutput>,
	TInput extends undefined ? undefined : InferInputEntries<NonNullable<TInput>>
> {
	return 0 as any;
}

export function resolver<TParentSchema extends ZodType<any, any, any>>(
	schema: TParentSchema,
	fields: Record<string, Operation<TParentSchema, any, any>>,
): void {
	// ...
}
