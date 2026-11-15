import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatWeek } from '../formatWeek'
import type { WeekCount } from '../types'
import { axisTick, chartColors } from './chartTheme'
import { ChartTooltip } from './ChartTooltip'

/** Change over time for one series: columns, one hue, one baseline. */
export function WeeklyChart({ data }: { data: WeekCount[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        {/* Horizontal hairlines only, solid (never dashed): enough to read values, no more. */}
        <CartesianGrid vertical={false} stroke={chartColors.grid} />
        <XAxis
          dataKey="weekStart"
          tickFormatter={formatWeek}
          tick={axisTick}
          tickLine={false}
          axisLine={{ stroke: chartColors.grid }}
          minTickGap={16}
        />
        <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} width={40} />
        <Tooltip
          cursor={{ fill: chartColors.cursor }}
          content={(props) => (
            <ChartTooltip {...props} unit="applications" formatLabel={(label) => `Week of ${formatWeek(label)}`} />
          )}
        />
        {/* <= 24px wide, rounded only at the data end (top), square at the baseline. */}
        <Bar
          dataKey="count"
          fill={chartColors.bar}
          maxBarSize={24}
          radius={[4, 4, 0, 0]}
          activeBar={{ fill: chartColors.barHover }}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
