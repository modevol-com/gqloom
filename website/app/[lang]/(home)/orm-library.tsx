"use client"
import clsx from "clsx"
import DynamicLink from "fumadocs-core/dynamic-link"
import { Fragment, memo, useMemo, useState } from "react"
import type { LangProps } from "./page"

const ormIntroCN = {
  title: "增删改查接口已就绪，只待启用",
  descriptions: [
    "恰似以精巧技艺织就锦章，将精准定义的数据库表格毫无瑕疵地嵌入 GraphQL Schema 架构的广袤天地，实现浑然一体的无缝对接。",
    "凭借片缕几行代码，即可从数据库表格出发，举重若轻地搭建起增删改查操作体系，全方位沉浸于对象关系映射（ORM）技术所赋予的便捷体验之中。",
    "不光是解析器能够灵活塑造，即便是单一操作，也可通过巧妙融入输入项与中间件，达成独具匠心的定制效果，精准贴合多样化需求。",
    "凭借高度灵活的构建策略，游刃有余地对解析器进行拼接组合，毫无阻碍地在数据图中植入各类操作，充分挖掘并拓展无限可能。",
  ],
}

const ormIntroEN = {
  title: "CRUD interfaces are ready for activation",
  descriptions: [
    "Like a skilled weaver, embed precisely defined database tables seamlessly into the GraphQL Schema.",
    "With just a few lines of code, easily build a CRUD system and enjoy ORM's convenience.",
    "Both resolvers and single operations can be customized with inputs and middleware to meet diverse needs.",
    "Using a flexible approach, freely combine resolvers and add operations to the graph for endless potential.",
  ],
}

const supportedORM = ["Drizzle", "MikroORM", "Prisma"] as const
export type SupportedORM = (typeof supportedORM)[number]

export const ORMLibrary = memo<
  LangProps & {
    DrizzleMDX: React.ReactNode
    PrismaMDX: React.ReactNode
    MikroOrmMDX: React.ReactNode
  }
>(function ORMLibrary({ lang, DrizzleMDX, PrismaMDX, MikroOrmMDX }) {
  const intro = lang === "cn" ? ormIntroCN : ormIntroEN

  const [tab, SetTab] = useState<SupportedORM>("Drizzle")

  const OrmArray = useMemo(() => {
    const splitter = lang === "cn" ? "、" : ", "
    return supportedORM.map((orm, index) => (
      <Fragment key={orm}>
        <span
          className={clsx(
            "mx-[0.2em] border-b-2 border-solid transition-colors cursor-pointer hover:text-rose-700 hover:opacity-80 dark:hover:text-rose-200",
            tab === orm ? "border-rose-500" : "opacity-60 border-transparent"
          )}
          onClick={() => SetTab(orm)}
        >
          {orm}
        </span>
        {index !== supportedORM.length - 1 && <>{splitter}</>}
      </Fragment>
    ))
  }, [tab, lang])

  const description = useMemo(() => {
    const hash = lang === "cn" ? "#解析器工厂" : "#resolver-factory"
    const ormPage = {
      Drizzle: "drizzle",
      Prisma: "prisma",
      MikroORM: "mikro-orm",
    }[tab]
    const ResolverFactory = (
      <DynamicLink
        className="text-amber-600 dark:text-orange-400 font-bold"
        href={`/[lang]/docs/schema/${ormPage}${hash}`}
      >
        ResolverFactory
      </DynamicLink>
    )
    if (lang === "cn") {
      return (
        <>
          通过 {ResolverFactory} 使用在 {OrmArray} 已定义的数据库模型创建 CRUD{" "}
          操作。
        </>
      )
    }

    return (
      <>
        Create CRUD operations using defined database models from {OrmArray}{" "}
        with {ResolverFactory}.
      </>
    )
  }, [lang, tab, OrmArray])
  return (
    <section className="mt-16 px-6 md:mt-20 flex flex-col items-center">
      <h2 className="text-3xl font-bold tracking-wider">{intro.title}</h2>
      <div className="flex flex-col mt-8 lg:flex-row gap-8">
        <div className="max-w-lg mt-4">
          <p className="text-xl text-slate-900 dark:text-slate-100">
            {description}
          </p>
          <ul className="space-y-10 mt-16">
            {intro.descriptions.map((d, index) => (
              <li
                key={index}
                className="text-slate-700/70 dark:text-slate-300/70"
              >
                {d}
              </li>
            ))}
          </ul>
        </div>
        <div className="w-xl max-w-[90vw]">
          {tab === "Drizzle" && DrizzleMDX}
          {tab === "Prisma" && PrismaMDX}
          {tab === "MikroORM" && MikroOrmMDX}
        </div>
      </div>
    </section>
  )
})
