export type MayPromise<T> = T | Promise<T>

export type IsAny<T> = 0 extends 1 & T ? true : false

/**
 * @example
 * ```TypeScript
 * type A = { a?: { b?: { c: string } } }
 * type B = InferPropertyType<A, "a"> // { b?: { c: string } }
 * type C = InferPropertyType<A, "a.b"> // { c: string }
 * ```
 */
export type InferPropertyType<
	T,
	K extends string,
> = K extends `${infer K1}.${infer K2}`
	? K1 extends keyof T
		? InferPropertyType<NonNullable<T[K1]>, K2>
		: never
	: K extends keyof T
	  ? NonNullable<T[K]>
	  : never
