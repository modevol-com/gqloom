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
