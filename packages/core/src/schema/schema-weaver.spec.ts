import { describe, expect, it } from "vitest"
import { isSchemaVendorWeaver } from "./schema-weaver"

describe("isSchemaVendorWeaver", () => {
  it("should return true for a valid SchemaWeaver", () => {
    const validSchemaWeaver = {
      vendor: "testVendor",
      getGraphQLType: (schema: any) => schema,
    }

    expect(isSchemaVendorWeaver(validSchemaWeaver)).toBe(true)
  })

  it("should return false for an object missing the 'vendor' property", () => {
    const invalidSchemaWeaver = {
      getGraphQLType: (schema: any) => schema,
    }

    expect(isSchemaVendorWeaver(invalidSchemaWeaver)).toBe(false)
  })

  it("should return false for an object missing the 'getGraphQLType' property", () => {
    const invalidSchemaWeaver = {
      vendor: "testVendor",
    }

    expect(isSchemaVendorWeaver(invalidSchemaWeaver)).toBe(false)
  })

  it("should return false for an object with 'vendor' not being a string", () => {
    const invalidSchemaWeaver = {
      vendor: 123,
      getGraphQLType: (schema: any) => schema,
    }

    expect(isSchemaVendorWeaver(invalidSchemaWeaver)).toBe(false)
  })

  it("should return false for an object with 'getGraphQLType' not being a function", () => {
    const invalidSchemaWeaver = {
      vendor: "testVendor",
      getGraphQLType: "not a function",
    }

    expect(isSchemaVendorWeaver(invalidSchemaWeaver)).toBe(false)
  })

  it("should return false for a non-object and non-function input", () => {
    expect(isSchemaVendorWeaver(null)).toBe(false)
    expect(isSchemaVendorWeaver(undefined)).toBe(false)
    expect(isSchemaVendorWeaver(123)).toBe(false)
    expect(isSchemaVendorWeaver("string")).toBe(false)
    expect(isSchemaVendorWeaver([])).toBe(false)
  })
})
