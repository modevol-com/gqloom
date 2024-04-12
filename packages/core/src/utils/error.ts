export function markErrorLocation<TError>(
  error: TError,
  ...locations: string[]
): TError {
  if (error instanceof Error) {
    error.message = markLocation(error.message, ...locations)
  }
  return error
}

/**
 * mark message with location
 * @param message origin message
 * @param locations where error happened
 * @returns message with location
 * @example markLocation("error", "banana") // "[banana] hello"
 * @example markLocation("error", fruit, banana) // "[fruit.banana] error"
 * @example markLocation("[banana] error", "fruit") // "[fruit.banana] error"
 * @example markLocation("[fruit.banana] error", "favorite") // "[favorite.fruit.banana] error"
 */
export function markLocation(message: string, ...locations: string[]): string {
  // If there's no valid location provided, return the original message
  if (locations.length === 0) {
    return message
  }

  // Check if the message already has a location prefix and extract it if present
  const [existingPrefix, newMessage] = (() => {
    const existingPrefixPattern = /^\[(.*?)\]/
    const match = existingPrefixPattern.exec(message)

    if (match) return [match[1], message.slice(match[0].length).trim()]
    return [undefined, message]
  })()

  // Concatenate the new locations with the existing one (if any)
  const combinedLocation = locations
    .concat(existingPrefix ? [existingPrefix] : [])
    .join(".")

  // Add or update the location prefix in the message
  return `[${combinedLocation}] ${newMessage}`
}
