export function pascalCase(str: string): string {
  return str
    .split(/[\s-_]+/)
    .map((word, index) =>
      index === 0
        ? word.charAt(0).toUpperCase() + word.slice(1)
        : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join("")
}

export function capitalize<T extends string>(str: T): Capitalize<T> {
  return (str.slice(0, 1).toUpperCase() + str.slice(1)) as Capitalize<T>
}

export function screamingSnakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .split(/[\s-_]+/)
    .map((word) => word.toUpperCase())
    .join("_")
}
