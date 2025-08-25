import { colord, extend } from "colord"
import mixPlugin from "colord/plugins/mix"
import { defineComponent } from "vue"

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

const mid = 0.7
const factor = 1 / mid ** 2

const x = (i: number) => i / (colorTotal - 1)

export const FlowingLines = defineComponent({
  name: "FlowingLines",
  props: {
    class: String,
  },
  setup(props: { class?: string }) {
    return () => (
      <svg preserveAspectRatio="none" viewBox="0 0 360 360" class={props.class}>
        {colorList.map((color, i) => (
          <path
            key={i}
            d={`M0 ${(i * 360) / colorTotal - 1} Q 120 ${toBottom(
              100,
              i
            )} 360 ${toBottom(70, i)}`}
            style={{
              fill: "none",
              strokeWidth: 1,
              stroke: color.toHex(),
              opacity: 1 - (x(i) - mid) ** 2 * factor,
              strokeDasharray: 1000,
            }}
          />
        ))}
      </svg>
    )
  },
})
