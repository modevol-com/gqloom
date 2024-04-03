export class LocatableError extends Error {
  locations: string[] = []
  constructor(message: string) {
    super(message)
    this.name = "SchemaError"
  }
  at(...locations: string[]) {
    this.locations.push(...locations)
    return this
  }

  override get message() {
    if (!this.locations.length) return super.message
    return `${this.locations.reverse().join(".")}: ${super.message}`
  }
}

export function markErrorLocation(error: unknown, ...locations: string[]) {
  if (error instanceof LocatableError) {
    error.at(...locations)
  } else if (error instanceof Error) {
    error.message = `${locations.join(".")}: ${error.message}`
  }
}
