import { describe, expect, it } from "vitest"
import { pascalCase } from "./string"

describe("toPascalCase", () => {
  it("should convert kebab-case to PascalCase", () => {
    expect(pascalCase("hello-world")).toBe("HelloWorld")
  })

  it("should convert camelCase to PascalCase", () => {
    expect(pascalCase("helloWorld")).toBe("HelloWorld")
  })

  it("should convert snake_case to PascalCase", () => {
    expect(pascalCase("hello_world")).toBe("HelloWorld")
  })

  it("should convert space separated words to PascalCase", () => {
    expect(pascalCase("hello world")).toBe("HelloWorld")
  })

  it("should return empty string for empty input", () => {
    expect(pascalCase("")).toBe("")
  })

  it("should capitalize the first letter of each word", () => {
    expect(pascalCase("multiple-words-here")).toBe("MultipleWordsHere")
  })
})
