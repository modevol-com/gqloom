import clsx from "clsx"

export function FlowingLines() {
  return (
    <svg
      viewBox="0 0 1000 1000"
      className={clsx(
        "fixed top-0 left-0 w-full h-full",
        "opacity-10 -z-10" // 背景基础样式
      )}
    >
      <path
        className={clsx(
          "fill-none stroke-[2] stroke-linecap-round", // 公共路径样式
          "animate-flow motion-reduce:animate-none", // 动画相关
          "stroke-pink-500/80 dark:stroke-rose-400/60" // 颜色及透明度
        )}
        d="M0,500 Q250,300 500,500 T1000,500"
      />
      <path
        className={clsx(
          "fill-none stroke-[2] stroke-linecap-round",
          "animate-flow motion-reduce:animate-none delay-[-4000ms]",
          "stroke-emerald-500/80 dark:stroke-cyan-400/60"
        )}
        d="M0,400 Q250,600 500,400 T1000,400"
      />
      <path
        className={clsx(
          "fill-none stroke-[2] stroke-linecap-round",
          "animate-flow motion-reduce:animate-none delay-[-2000ms]",
          "stroke-amber-500/80 dark:stroke-yellow-400/60"
        )}
        d="M0,600 Q250,400 500,600 T1000,600"
      />
    </svg>
  )
}
