"use client"

import clsx from "clsx"
import { memo, useMemo, useState } from "react"
import type { LangProps } from "./page"

const ormIntroCN = {
  title: "Schema 和 API 已就绪",
  description: "通过 ResolverFactory 使用你已定义的数据库模型创建 CRUD 操作",
}

const ormIntroEN = {
  title: "Already Defined Schema and API",
  description:
    "Create CRUD operations using your defined database models with ResolverFactory",
}

const supportedORM = ["Drizzle", "MikroORM", "Prisma"] as const
type SupportedORM = (typeof supportedORM)[number]

export const ORMLibrary = memo<LangProps>(function ORMLibrary({ lang }) {
  const intro = lang === "cn" ? ormIntroCN : ormIntroEN

  const [tab, SetTab] = useState<SupportedORM>("Drizzle")

  const OrmArray = useMemo(
    () => (
      <span className="inline-block">
        {supportedORM.map((orm) => (
          <span
            className={clsx(
              "mx-[0.2em] border-b-2 border-solid transition-colors duration-300 cursor-pointer hover:text-rose-700 dark:hover:text-rose-200",
              tab === orm ? "border-rose-500" : "opacity-70 border-transparent"
            )}
            key={orm}
            onClick={() => SetTab(orm)}
          >
            {orm}
          </span>
        ))}
      </span>
    ),
    [tab]
  )

  const OrmDescription = useMemo(() => {
    if (lang === "cn") {
      return (
        <p className="text-slate-800/70 dark:text-slate-200/70">
          使用 {OrmArray} 在顷刻间构建完整的 API
        </p>
      )
    }
    return (
      <p className="text-slate-800/70 dark:text-slate-200/70">
        Build full API quickly with {OrmArray}
      </p>
    )
  }, [lang, OrmArray])

  return (
    <section className="mt-16 px-6 md:mt-20 flex flex-col items-center">
      <h2 className="text-3xl font-bold tracking-wider">{intro.title}</h2>
      <p className="mt-6 text-slate-800/70 dark:text-slate-200/70">
        {intro.description}
      </p>
      {OrmDescription}
    </section>
  )
})
