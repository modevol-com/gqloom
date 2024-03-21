import type { FieldOptions, OperationOptions } from ".."

export function getOperationOptions(
	resolveOrOptions: // biome-ignore lint/suspicious/noExplicitAny: no need to check
		| ((parent: any) => any)
		// biome-ignore lint/suspicious/noExplicitAny: no need to check
		| OperationOptions<any, any, any>
		// biome-ignore lint/suspicious/noExplicitAny: no need to check
		| FieldOptions<any, any, any, any>,
) {
	if (typeof resolveOrOptions === "function") {
		return { resolve: resolveOrOptions }
	}
	return resolveOrOptions
}
