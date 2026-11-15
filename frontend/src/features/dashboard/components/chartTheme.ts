// One place for the chart colors, so every chart reads as part of the same system.
// Single-series charts use ONE hue (the brand indigo): the bars encode amount, not identity,
// so a different color per bar would add noise and suggest a meaning that is not there.
// The hue was checked with a palette validator: contrast >= 3:1 against the white card.

export const chartColors = {
  bar: '#4f46e5', // brand-600
  barHover: '#6366f1', // brand-500: the hovered bar lightens slightly to show it responds
  grid: '#e2e8f0', // slate-200: hairline, recessive
  axisText: '#64748b', // slate-500: text token, never the data color
  cursor: '#eef2ff', // brand-50 wash behind the hovered band
} as const

export const axisTick = { fill: chartColors.axisText, fontSize: 12 }
