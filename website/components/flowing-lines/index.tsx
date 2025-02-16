import clsx from "clsx"
import { colord, extend } from "colord"
import mixPlugin from "colord/plugins/mix"

extend([mixPlugin])

const originColors = ["#FBBF24", "#F5775B", "#CA5BF2"]
const colorTotal = 20
const colorGroupSize = colorTotal / (originColors.length - 1)

const colorList = new Array(colorTotal).fill(0).map((_, i) => {
  const currentOriginIndex = Math.floor(i / colorGroupSize)
  const nextOriginIndex = currentOriginIndex + 1

  return colord(originColors[currentOriginIndex]).mix(
    originColors[nextOriginIndex],
    (i % colorGroupSize) / colorGroupSize
  )
})

const toBottom = (bottom: number, index: number) =>
  (index / colorTotal) * bottom + (360 - bottom)

export function FlowingLines({ className }: { className?: string }) {
  return (
    <svg
      preserveAspectRatio="none"
      viewBox="0 0 360 360"
      className={clsx("size-full", className)}
    >
      {colorList.map((color, i) => (
        <path
          key={i}
          d={`M0 ${(i * 360) / colorTotal} Q 120 ${toBottom(120, i)} 360 ${toBottom(90, i)}`}
          style={{
            fill: "none",
            strokeWidth: 1,
            stroke: color.toHex(),
            opacity: 0.9 * (i / colorTotal) + 0.1,
            strokeDasharray: 1000,
            animationDelay: `-${i * 100}ms`,
          }}
        />
      ))}
    </svg>
  )
}
