import DynamicLink from "fumadocs-core/dynamic-link"
import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { memo } from "react"

export default function HomePage() {
  return (
    <main className="flex flex-col items-center">
      <Hero />
    </main>
  )
}

const Hero = memo(function Hero() {
  return (
    <div className="flex flex-col-reverse sm:flex-row max-w-5xl justify-evenly items-center w-full pt-0 pb-12 sm:pt-10 md:pt-16 md:pb-16">
      <div className="flex flex-col gap-6 max-w-md text-center items-center">
        <h1 className="text-4xl text-transparent bg-gradient-to-r from-pink-500 to-yellow-500 dark:from-rose-400 dark:to-orange-300 sm:text-5xl font-bold bg-clip-text">
          GraphQL Loom
        </h1>
        <p className="text-lg">Weaving runtime types into a GraphQL Schema</p>
        <div className="flex flex-wrap px-4 gap-4">
          <Link
            href="https://github.com/modevol-com/gqloom"
            target="_blank"
            className="text-nowrap border-orange-400 bg-pink-300/10 border-2 transition-colors duration-300 hover:bg-orange-300/20 py-3 px-6 rounded-full"
          >
            Star on GitHub
          </Link>
          <DynamicLink
            href="/[lang]/docs/getting-started"
            className="text-nowrap px-6 py-3 font-medium text-white transition-colors duration-300 bg-gradient-to-r from-pink-600 to-orange-400 rounded-full hover:from-pink-500 hover:to-amber-300"
          >
            Getting Started <ArrowRight className="ml-2 inline-block" />
          </DynamicLink>
        </div>
      </div>
      <img className="sm:w-sm w-3xs" src="/gqloom.svg" alt="GQLoom" />
    </div>
  )
})
