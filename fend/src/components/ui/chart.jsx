"use client"


import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line as RechartsLine,
  XAxis as RechartsXAxis,
  YAxis as RechartsYAxis,
  Tooltip,
  AreaChart as RechartsAreaChart,
  Area as RechartsArea,
} from "recharts"


export function ChartTooltipContent({ title, items, className }) {
  return (
    <div className={`rounded-md border bg-popover p-4 text-popover-foreground shadow-md ${className}`}>
      <div className="mb-2 font-medium">{title}</div>
      <ul className="grid gap-1">
        {items.map((item, i) => (
          <li key={i} className="grid grid-cols-[20px_1fr] items-center gap-2 text-sm">
            <span className={`block h-2 w-2 rounded-full ${item.color}`} />
            <span>
              {item.label}: <span className="font-medium">{item.value}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ChartContainer({ className, children }) {
  return <div className={`w-full h-full ${className}`}>{children}</div>
}

export function Chart({ children }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      {children}
    </ResponsiveContainer>
  )
}

export const LineChart = RechartsLineChart
export const Line = RechartsLine
export const XAxis = RechartsXAxis
export const YAxis = RechartsYAxis
export const AreaChart = RechartsAreaChart
export const Area = RechartsArea

export const ChartTooltip = Tooltip
