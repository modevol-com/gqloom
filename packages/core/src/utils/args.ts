import type {
  FieldOptions,
  OperationOptions,
  OperationOrFieldType,
  OperationType,
} from ".."

export function getOperationOptions<
  T extends OperationOrFieldType = OperationType,
>(
  resolveOrOptions: T extends "field"
    ? ((parent: any) => any) | FieldOptions<any, any, any, any>
    : (() => any) | OperationOptions<any, any, any>
): T extends "field"
  ? FieldOptions<any, any, any, any>
  : OperationOptions<any, any, any> {
  if (typeof resolveOrOptions === "function") {
    return { resolve: resolveOrOptions }
  }
  return resolveOrOptions as any
}
