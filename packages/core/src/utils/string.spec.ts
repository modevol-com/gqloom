import { describe, expect, it } from "vitest"
import { toPascalCase } from "./string"

describe("toPascalCase", () => {
  it("should convert kebab-case to PascalCase", () => {
    expect(toPascalCase("hello-world")).toBe("HelloWorld")
  })

  it("should convert snake_case to PascalCase", () => {
    expect(toPascalCase("hello_world")).toBe("HelloWorld")
  })

  it("should convert space separated words to PascalCase", () => {
    expect(toPascalCase("hello world")).toBe("HelloWorld")
  })

  it("should handle mixed case and special characters", () => {
    expect(toPascalCase("hElLo-wOrLd!@#")).toBe("HelloWorld!@#")
  })

  it("should return empty string for empty input", () => {
    expect(toPascalCase("")).toBe("")
  })

  it("should capitalize the first letter of each word", () => {
    expect(toPascalCase("multiple-words-here")).toBe("MultipleWordsHere")
  })
})
