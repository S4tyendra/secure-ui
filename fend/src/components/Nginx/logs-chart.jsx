"use client"
import {
  Chart,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  Line,
  LineChart,
  XAxis,
  YAxis,
  Area,
  AreaChart,
} from "@/components/ui/chart"
import { formatTime } from "@/lib/log-utils"



export function LogsChart({ data }) {
  return (
    <ChartContainer className="h-full">
      <Chart>
        <AreaChart 
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="status2xx" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.5}/>
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="status3xx" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="status4xx" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.5}/>
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="status5xx" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.5}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis
            dataKey="timestamp"
            tickFormatter={(value) => formatTime(value)}
            tickLine={false}
            axisLine={false}
            padding={{ left: 20, right: 20 }}
            fontSize={12}
            stroke="#64748b"
          />
          <YAxis 
            tickLine={false} 
            axisLine={false} 
            width={30}
            fontSize={12}
            stroke="#64748b"
          />
          <ChartTooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload
                return (
                  <ChartTooltipContent
                    className="w-[200px]"
                    title={formatTime(data.timestamp)}
                    items={[
                      {
                        label: "2xx Status",
                        value: data.status2xx.toString(),
                        color: "bg-green-500",
                      },
                      {
                        label: "3xx Status",
                        value: data.status3xx.toString(),
                        color: "bg-blue-500",
                      },
                      {
                        label: "4xx Status",
                        value: data.status4xx.toString(),
                        color: "bg-amber-500",
                      },
                      {
                        label: "5xx Status",
                        value: data.status5xx.toString(),
                        color: "bg-red-500",
                      },
                    ]}
                  />
                )
              }
              return null
            }}
          />
          <Area
            type="monotone"
            dataKey="status2xx"
            stroke="#22c55e"
            fillOpacity={1}
            fill="url(#status2xx)"
            strokeWidth={2}
            activeDot={{ r: 6 }}
            name="2xx Status"
            stackId="1"
          />
          <Area
            type="monotone"
            dataKey="status3xx"
            stroke="#3b82f6"
            fillOpacity={1}
            fill="url(#status3xx)"
            strokeWidth={2}
            activeDot={{ r: 6 }}
            name="3xx Status"
            stackId="2"
          />
          <Area
            type="monotone"
            dataKey="status4xx"
            stroke="#f59e0b"
            fillOpacity={1}
            fill="url(#status4xx)"
            strokeWidth={2}
            activeDot={{ r: 6 }}
            name="4xx Status"
            stackId="3"
          />
          <Area
            type="monotone"
            dataKey="status5xx"
            stroke="#ef4444"
            fillOpacity={1}
            fill="url(#status5xx)"
            strokeWidth={2}
            activeDot={{ r: 6 }}
            name="5xx Status"
            stackId="4"
          />
        </AreaChart>
      </Chart>
    </ChartContainer>
  )
}
