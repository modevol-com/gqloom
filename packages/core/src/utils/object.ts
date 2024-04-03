/**
 * Creates an object map with the same keys as `map` and values generated by
 * running each value of `record` thru `fn`.
 */
export function mapValue<T, V>(
  record: Record<string, T>,
  fn: (value: T, key: string) => V
): Record<string, V> {
  const result = Object.create(null)

  for (const key of Object.keys(record)) {
    result[key] = fn(record[key], key)
  }
  return result
}