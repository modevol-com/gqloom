import { createI18nMiddleware } from "fumadocs-core/i18n"
import { type NextMiddleware, NextResponse } from "next/server"
import { i18n } from "./lib/i18n"

const removeHtmlSuffix: NextMiddleware = (request) => {
  const url = new URL(request.url)
  let pathname = url.pathname

  // 移除 .html 后缀
  if (pathname.endsWith(".html")) {
    pathname = pathname.slice(0, -5)
  }

  // 移除 /index 后缀
  if (pathname.endsWith("/index")) {
    pathname = pathname.slice(0, -6)
  }

  // 如果路径发生了变化，重定向到新的路径
  if (pathname !== url.pathname) {
    url.pathname = pathname
    return NextResponse.redirect(url)
  }

  // 如果路径没有变化，继续下一个中间件
  return
}

export default composeMiddlewares(removeHtmlSuffix, createI18nMiddleware(i18n))

export const config = {
  // Matcher ignoring `/_next/` and `/api/`
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|gqloom.svg).*)"],
}

/**
 * - Registers as many middlwares as needed.
 *
 * - Middlewares are invoked in the order they were registerd.
 *
 * - The first middleware to return the instance of NextResponse breaks the chain.
 *
 * - As in the next docs, middlewares are invoked for every request including next
 *   requests to fetch static assets and the sorts.
 */
function composeMiddlewares(...middlewares: NextMiddleware[]): NextMiddleware {
  const validMiddlewares = middlewares.reduce((acc, _middleware) => {
    if (typeof _middleware === "function") {
      return [...acc, _middleware]
    }

    return acc
  }, [] as NextMiddleware[])

  return async function middleware(request, evt) {
    for (const _middleware of validMiddlewares) {
      const result = await _middleware(request, evt)

      if (result instanceof NextResponse) {
        return result
      }
    }

    return NextResponse.next()
  }
}
