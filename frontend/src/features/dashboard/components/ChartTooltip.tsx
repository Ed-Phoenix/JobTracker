interface TooltipPayloadItem {
  value?: number | string | ReadonlyArray<number | string>
}

interface ChartTooltipProps {
  active?: boolean
  payload?: ReadonlyArray<TooltipPayloadItem>
  label?: string | number
  /** Turns the category (x value) into a readable title, e.g. "Week of Aug 24". */
  formatLabel: (label: string) => string
  /** Unit after the number: "applications". */
  unit: string
}

/** Hover / keyboard-focus readout. The value leads (it is what the reader wants), the label follows. */
export function ChartTooltip({ active, payload, label, formatLabel, unit }: ChartTooltipProps) {
  if (!active || !payload?.length) {
    return null
  }

  const value = Number(payload[0].value ?? 0)

  return (
    <div className="rounded-lg bg-white px-3 py-2 text-sm shadow-lg ring-1 ring-slate-200">
      <p className="font-semibold text-slate-900">
        {value} {value === 1 ? unit.replace(/s$/, '') : unit}
      </p>
      <p className="text-slate-600">{formatLabel(String(label ?? ''))}</p>
    </div>
  )
}
