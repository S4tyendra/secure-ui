"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Legend } from "recharts"
import { useIsMobile } from "@/hooks/use-mobile"
import useApi from "@/hooks/useApi"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

// Helper function to format bytes
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Note: This component now expects logData, isLoading, error, selectedLog, chartConfig, and fetchLogs as props
export function NginxLogsChart({
  logData = [],
  isLoading = false,
  error = null,
  selectedLog = null,
  chartConfig = {}, // Provide a default empty object
  fetchLogs // Function to trigger refresh, passed from parent
}) {
  // formatBytes helper can remain here if only used locally
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // No internal state for data fetching needed anymore
  // const isMobile = useIsMobile() // Keep if needed for layout decisions, otherwise remove

  // Ensure chartConfig has default values if needed, or rely on parent providing complete config
  const safeChartConfig = React.useMemo(() => ({
    status_2xx: { label: " 2xx Success", color: "#22c55e", ...chartConfig.status_2xx },
    status_3xx: { label: " 3xx Redirection", color: "#3b82f6", ...chartConfig.status_3xx },
    status_4xx: { label: " 4xx Client Error", color: "#f97316", ...chartConfig.status_4xx },
    status_5xx: { label: " 5xx Server Error", color: "#ef4444", ...chartConfig.status_5xx },
    response_size: { label: " Response Size", color: "#8b5cf6", ...chartConfig.response_size },
  }), [chartConfig]);


  return (
    <Card className="@container/card">
      {/* Keep Refresh Button but use the fetchLogs prop */}
      <CardHeader className="relative">
        <CardTitle>Nginx Logs Analysis</CardTitle>
        <CardDescription>
          {selectedLog ? (
            <span>
              Analyzing log file: <strong>{selectedLog.name}</strong> ({formatBytes(selectedLog.size_bytes)})
            </span>
          ) : (
            <span>Select a log file to analyze</span>
          )}
        </CardDescription>
        <div className="absolute right-4 top-4 flex items-center gap-2">
          {/* Refresh button now calls the function passed via props */}
          <Button
            onClick={fetchLogs} // Use the function passed from the parent
            variant="outline"
            size="icon"
            disabled={isLoading} // Use isLoading prop
            className="mr-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          {/* Time range selection remains removed */}
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            {/* Display error from props */}
            <AlertDescription>{typeof error === 'string' ? error : JSON.stringify(error)}</AlertDescription>
          </Alert>
        )}
        
        {isLoading && (
          <div className="w-full h-[250px] flex items-center justify-center">
            <Skeleton className="h-[250px] w-full rounded-xl" />
          </div>
        )}
        
        {!isLoading && logData.length === 0 && (
          <div className="w-full h-[250px] flex items-center justify-center text-gray-500">
            No log data available for the selected period.
          </div>
        )}
        
        {!isLoading && logData.length > 0 && (
          <ChartContainer
            config={safeChartConfig} // Use the memoized safe config
            className="aspect-auto h-[350px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              {/* Use logData prop */}
              <AreaChart data={logData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  {/* Use safeChartConfig here too */}
                  {Object.entries(safeChartConfig).map(([key, config]) => (
                    <linearGradient key={key} id={`fill${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={config.color} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={config.color} stopOpacity={0.1} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label" // Use the formatted date-time label
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={60} // Increase gap to avoid clutter with date+time
                  // tickFormatter is not needed as 'label' is pre-formatted
                />
                <YAxis />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                    className="backdrop-blur-2xl bg-black/10 border border-black/20 dark:bg-white/10 dark:border-white/20"
                       labelFormatter={(label, payload) => {
                        // Derive the hour start/end from the dateTime key in the payload
                        if (payload && payload.length > 0 && payload[0].payload.dateTime) {
                           const startDt = new Date(payload[0].payload.dateTime);
                           const endDt = new Date(startDt.getTime() + 60 * 60 * 1000); // Add 1 hour
                           
                           const formatOptions = {
                             month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false
                           };

                           const startStr = startDt.toLocaleDateString("en-US", formatOptions).replace(",", "");
                           const endStr = endDt.toLocaleTimeString("en-US", {hour: '2-digit', minute: '2-digit', hour12: false }); // Only show time for end

                           return `${startStr} - ${endStr}`;
                        }
                        return label; // Fallback to the axis label
                      }}
                       formatter={(value, name) => {
                        if (name === "response_size") {
                          return [formatBytes(value), "Response Size"];
                        }
                        // Don't show internal keys in tooltip body
                        if (name === "dateTime" || name === "label") return null;
                        // Use safeChartConfig here
                        return [value, safeChartConfig[name]?.label || name];
                      }}
                      indicator="dot"
                    />
                  }
                />
                <Legend />
                {/* Render status code areas first */}
                <Area
                  type="monotone"
                  dataKey="status_2xx"
                  stackId="1"
                  stroke={safeChartConfig.status_2xx.color}
                  fill={`url(#fillstatus_2xx)`}
                />
                <Area
                  type="monotone"
                  dataKey="status_3xx"
                  stackId="1"
                  stroke={safeChartConfig.status_3xx.color}
                  fill={`url(#fillstatus_3xx)`}
                />
                <Area
                  type="monotone"
                  dataKey="status_4xx"
                  stackId="1"
                  stroke={safeChartConfig.status_4xx.color}
                  fill={`url(#fillstatus_4xx)`}
                />
                <Area
                  type="monotone"
                  dataKey="status_5xx"
                  stackId="1"
                  stroke={safeChartConfig.status_5xx.color}
                  fill={`url(#fillstatus_5xx)`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
