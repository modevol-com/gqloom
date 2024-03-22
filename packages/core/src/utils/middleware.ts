import type { MayPromise } from "./types"

type ResolveResult = any

export type Middleware = (
	next: () => Promise<ResolveResult>,
) => Promise<ResolveResult>

export function applyMiddlewares(
	middlewares: Middleware[],
	resolveFunction: () => MayPromise<ResolveResult>,
): Promise<ResolveResult> {
	const next = async (index: number): Promise<unknown> => {
		if (index === middlewares.length) {
			return resolveFunction()
		}
		const middleware = middlewares[index]
		return middleware(() => next(index + 1))
	}
	return next(0)
}
