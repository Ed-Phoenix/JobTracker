// One place for the chart colors, so every chart reads as part of the same system.
// Single-series charts use ONE hue (the brand indigo): the bars encode amount, not identity,
// so a different color per bar would add noise and suggest a meaning that is not there.
//
// The values are CSS variables defined in index.css, so the charts follow the light/dark theme
// without re-rendering. Each mode has its own validated step (contrast >= 3:1 against its card),
// not an automatic inversion: brand-600 on white, brand-500 on slate-900.

export const chartColors = {
  bar: 'var(--color-chart-bar)',
  barHover: 'var(--color-chart-bar-hover)', // the hovered bar lightens slightly to show it responds
  grid: 'var(--color-line)', // hairline, recessive
  axisText: 'var(--color-fg-subtle)', // text token, never the data color
  cursor: 'var(--color-chart-cursor)', // wash behind the hovered band
} as const

export const axisTick = { fill: chartColors.axisText, fontSize: 12 }
