"use client"
import DynamicLink from "fumadocs-core/dynamic-link"
import { useParams } from "next/navigation"
import type React from "react"
import { memo, useEffect, useMemo, useRef, useState } from "react"

export const RuntimeTypes = memo(() => {
  const [currentItem, setCurrentItem] = useState(0)
  const [lock, setLock] = useState(false)
  const items = useMemo<React.FC<RuntimeTypeViewProps>[]>(
    () => [DefaultText, Valibot, Zod, Yup, Drizzle, Prisma, Mikro],
    []
  )

  useEffect(() => {
    if (lock) return
    const interval = setInterval(() => {
      setCurrentItem((prev) => (prev + 1) % items.length)
    }, 2333)

    return () => clearInterval(interval)
  }, [lock, items])

  const [widths, setWidths] = useState<number[]>([])

  return (
    <div
      onMouseEnter={() => setLock(true)}
      onMouseLeave={() => setLock(false)}
      className="relative inline-block h-[1.5em] mx-[0.1em]"
      style={{
        width: widths[currentItem],
        transition: "width 233ms ease-out",
      }}
    >
      {items.map((Item, i) => (
        <Item
          style={{
            ...(i != 0 && {
              position: "absolute",
              bottom: 0,
              left: 0,
            }),
            transition: "opacity 233ms ease-in-out",
            opacity: i === currentItem ? 1 : 0,
            pointerEvents: i === currentItem ? "auto" : "none",
          }}
          key={i}
          onInit={(width) =>
            setWidths((prev) => {
              const array = prev.slice()
              array[i] = width
              return array
            })
          }
        />
      ))}
    </div>
  )
})

interface RuntimeTypeViewProps {
  style?: React.CSSProperties
  onInit?: (width: number) => void
}

const DefaultText = memo<RuntimeTypeViewProps>(({ style, onInit }) => {
  const params = useParams<{ lang: string }>()
  const ref = useInitWidth<HTMLSpanElement>(onInit)

  return (
    <span ref={ref} style={style} className="text-nowrap">
      {params.lang === "zh" ? "运行时类型" : "runtime types"}
    </span>
  )
})

const Valibot = memo<RuntimeTypeViewProps>(({ style, onInit }) => {
  const ref = useInitWidth<HTMLAnchorElement>(onInit)
  const params = useParams<{ lang: string }>()
  return (
    <DynamicLink
      ref={ref}
      style={style}
      href="/[lang]/docs/schema/valibot"
      className="dark:text-amber-200 text-orange-700 text-nowrap font-semibold"
    >
      Valibot {params.lang === "zh" ? "类型" : "types"}
    </DynamicLink>
  )
})

const Zod = memo<RuntimeTypeViewProps>(({ style, onInit }) => {
  const ref = useInitWidth<HTMLAnchorElement>(onInit)
  const params = useParams<{ lang: string }>()
  return (
    <DynamicLink
      ref={ref}
      style={style}
      href="/[lang]/docs/schema/zod"
      className="dark:text-cyan-400 text-cyan-700 text-nowrap font-semibold"
    >
      Zod {params.lang === "zh" ? "类型" : "types"}
    </DynamicLink>
  )
})

const Yup = memo<RuntimeTypeViewProps>(({ style, onInit }) => {
  const ref = useInitWidth<HTMLAnchorElement>(onInit)
  const params = useParams<{ lang: string }>()
  return (
    <DynamicLink
      ref={ref}
      style={style}
      href="/[lang]/docs/schema/yup"
      className="dark:text-stone-300 text-stone-700 text-nowrap font-semibold"
    >
      Yup {params.lang === "zh" ? "类型" : "types"}
    </DynamicLink>
  )
})

const Drizzle = memo<RuntimeTypeViewProps>(({ style, onInit }) => {
  const ref = useInitWidth<HTMLAnchorElement>(onInit)
  return (
    <DynamicLink
      ref={ref}
      style={style}
      href="/[lang]/docs/schema/drizzle"
      className="dark:text-teal-400 text-teal-600 text-nowrap font-semibold"
    >
      Drizzle Table
    </DynamicLink>
  )
})

const Prisma = memo<RuntimeTypeViewProps>(({ style, onInit }) => {
  const ref = useInitWidth<HTMLAnchorElement>(onInit)
  return (
    <DynamicLink
      ref={ref}
      style={style}
      href="/[lang]/docs/schema/drizzle"
      className="dark:text-blue-400 text-blue-700 text-nowrap font-semibold"
    >
      Prisma Model
    </DynamicLink>
  )
})

const Mikro = memo<RuntimeTypeViewProps>(({ style, onInit }) => {
  const ref = useInitWidth<HTMLAnchorElement>(onInit)
  return (
    <DynamicLink
      ref={ref}
      style={style}
      href="/[lang]/docs/schema/mikro-orm"
      className="dark:text-sky-400 text-sky-800 text-nowrap font-semibold"
    >
      Mikro ORM Entity
    </DynamicLink>
  )
})

function useInitWidth<THTMLElement extends HTMLElement>(
  onInit?: (width: number) => void
) {
  const ref = useRef<THTMLElement>(null)
  const onInitRef = useRef(onInit)
  onInitRef.current = onInit

  useEffect(() => {
    if (ref.current) onInitRef.current?.(ref.current.offsetWidth)
  }, [])

  return ref as React.RefObject<THTMLElement>
}
