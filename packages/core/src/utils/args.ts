import type { FieldOptions, OperationOptions } from ".."

export function getOperationOptions(
  resolveOrOptions:
    | ((parent: any) => any)
    | OperationOptions<any, any, any>
    | FieldOptions<any, any, any, any>
) {
  if (typeof resolveOrOptions === "function") {
    return { resolve: resolveOrOptions }
  }
  return resolveOrOptions
}
