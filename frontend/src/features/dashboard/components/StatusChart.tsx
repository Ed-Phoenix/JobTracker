import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { statusLabels } from '@/features/applications/types'
import type { StatusCount } from '../types'
import { axisTick, chartColors } from './chartTheme'
import { ChartTooltip } from './ChartTooltip'

/**
 * Horizontal bars in pipeline order (Applied -> ... -> No response), not sorted by size:
 * the statuses have a natural order and readers expect to follow the process top to bottom.
 * Each bar's value sits at its tip, so no value axis is needed.
 */
export function StatusChart({ data }: { data: StatusCount[] }) {
  const rows = data.map((entry) => ({ label: statusLabels[entry.status], count: entry.count }))

  return (
    <ResponsiveContainer width="100%" height={rows.length * 30 + 8}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 32, bottom: 4, left: 0 }}>
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="label"
          width={136}
          tick={axisTick}
          tickLine={false}
          axisLine={{ stroke: chartColors.grid }}
        />
        <Tooltip
          cursor={{ fill: chartColors.cursor }}
          content={(props) => <ChartTooltip {...props} unit="applications" formatLabel={(label) => label} />}
        />
        <Bar
          dataKey="count"
          fill={chartColors.bar}
          maxBarSize={18}
          radius={[0, 4, 4, 0]}
          activeBar={{ fill: chartColors.barHover }}
          isAnimationActive={false}
        >
          {/* Value at the bar tip, in a text color (never the bar color). */}
          <LabelList dataKey="count" position="right" fill="#334155" fontSize={12} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
