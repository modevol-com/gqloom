import { describe, expectTypeOf, it } from "vitest"
import { type InferPropertyType } from "./types"

interface A {
  a?: { b?: { c: string } }
}

interface B {
  b: { c: string }
  d: { c: string }
}

describe("InferPropertyType", () => {
  it("should infer property", () => {
    type C = InferPropertyType<A, "a">
    expectTypeOf<C>().toEqualTypeOf<{ b?: { c: string } } | undefined>()
  })

  it("should infer nested property", () => {
    type C = InferPropertyType<A, "a.b">
    expectTypeOf<C>().toEqualTypeOf<{ c: string } | undefined>()
  })

  it("should infer union property", () => {
    type C = InferPropertyType<B, "b" | "d" | "c">
    expectTypeOf<C>().toEqualTypeOf<{
      c: string
    }>()

    type C1 = InferPropertyType<B, "b" | "c">
    expectTypeOf<C1>().toEqualTypeOf<{
      c: string
    }>()

    type C2 = InferPropertyType<B, "b" | "d">
    expectTypeOf<C2>().toEqualTypeOf<{
      c: string
    }>()
  })
})
