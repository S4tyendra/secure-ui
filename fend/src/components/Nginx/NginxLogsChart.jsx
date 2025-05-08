"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Legend } from "recharts"
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

import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from "@/components/ui/button"
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export function NginxLogsChart({
  logData = [],
  isLoading = false,
  error = null,
  selectedLog = null,
  chartConfig = {}, 
  fetchLogs 
}) {
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };
  // Process chart data for optimal display
  const { chartDataForRender, firstTimestamp, lastTimestamp } = React.useMemo(() => {
    if (!logData || logData.length === 0) {
      return { chartDataForRender: [], firstTimestamp: 0, lastTimestamp: 0 };
    }

    const sortedData = [...logData].sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
    
    const BATCH_SIZE = 10;
    const batchedData = [];

    for (let i = 0; i < sortedData.length; i += BATCH_SIZE) {
      const batch = sortedData.slice(i, i + BATCH_SIZE);
      if (batch.length === 0) continue;

      let sum_status_2xx = 0;
      let sum_status_3xx = 0;
      let sum_status_4xx = 0;
      let sum_status_5xx = 0;
      let sum_response_size = 0;
      
      batch.forEach(entry => {
        sum_status_2xx += entry.status_2xx || 0;
        sum_status_3xx += entry.status_3xx || 0;
        sum_status_4xx += entry.status_4xx || 0;
        sum_status_5xx += entry.status_5xx || 0;
        sum_response_size += entry.response_size || 0;
      });

      const lastEntryInBatch = batch[batch.length - 1];
      const batchTimestamp = new Date(lastEntryInBatch.dateTime).getTime();
      
      batchedData.push({
        status_2xx: sum_status_2xx / batch.length,
        status_3xx: sum_status_3xx / batch.length,
        status_4xx: sum_status_4xx / batch.length,
        status_5xx: sum_status_5xx / batch.length,
        response_size: sum_response_size, // Sum for response size
        timestamp: batchTimestamp,
        dateTime: lastEntryInBatch.dateTime, // For tooltip
        label: new Date(batchTimestamp).toLocaleTimeString('en-US', { // For debug/fallback
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }),
        count: batch.length // Actual number of items in this batch
      });
    }

    const ft = batchedData.length > 0 ? batchedData[0].timestamp : 0;
    const lt = batchedData.length > 0 ? batchedData[batchedData.length - 1].timestamp : 0;

    return { chartDataForRender: batchedData, firstTimestamp: ft, lastTimestamp: lt };
  }, [logData]);

  const safeChartConfig = React.useMemo(() => ({
    status_2xx: { label: " 2xx Success", color: "#22c55e", ...chartConfig.status_2xx },
    status_3xx: { label: " 3xx Redirection", color: "#3b82f6", ...chartConfig.status_3xx },
    status_4xx: { label: " 4xx Client Error", color: "#f97316", ...chartConfig.status_4xx },
    status_5xx: { label: " 5xx Server Error", color: "#ef4444", ...chartConfig.status_5xx },
    response_size: { label: " Response Size", color: "#8b5cf6", ...chartConfig.response_size },
  }), [chartConfig]);

const xAxisTickFormatter = React.useCallback((unixTime) => {
  const date = new Date(unixTime);
  // Check if the current tick is the very first or very last in the dataset
  if (unixTime === firstTimestamp || unixTime === lastTimestamp) {
      return date.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
      }).replace(',', '');
  }
  // Format for intermediate ticks
  return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
  });
}, [firstTimestamp, lastTimestamp]);

return (
  <Card className="@container/card">
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
        <Button
          onClick={fetchLogs}
          variant="outline"
          size="icon"
          disabled={isLoading}
          className="mr-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
    </CardHeader>
    <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{typeof error === 'string' ? error : JSON.stringify(error)}</AlertDescription>
        </Alert>
      )}
      
      {isLoading && (
        <div className="w-full h-[250px] flex items-center justify-center">
          <Skeleton className="h-[250px] w-full rounded-xl" />
        </div>
      )}
      
      {!isLoading && chartDataForRender.length === 0 && (
        <div className="w-full h-[250px] flex items-center justify-center text-gray-500">
          No log data available for the selected period or not enough data to plot.
        </div>
      )}
      
      {!isLoading && chartDataForRender.length > 0 && (
        <ChartContainer
          config={safeChartConfig}
          className="aspect-auto h-[350px] w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartDataForRender} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                {Object.entries(safeChartConfig).map(([key, config]) => (
                  <linearGradient key={key} id={`fill${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={config.color} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={config.color} stopOpacity={0.1} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                type="number"
                dataKey="timestamp"
                domain={['dataMin', 'dataMax']}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickCount={7} // Suggest around 7 ticks
                interval="preserveStartEnd" // Ensure first and last ticks are shown based on domain
                tickFormatter={xAxisTickFormatter}
                allowDuplicatedCategory={false}
              />
              <YAxis />
              <ChartTooltip
                cursor={false}
                  content={
                    <ChartTooltipContent
                    className="backdrop-blur-2xl bg-black/10 border border-black/20 dark:bg-white/10 dark:border-white/20"
                       labelFormatter={(label, payload) => {
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
                        return label;
                      }}
                       formatter={(value, name) => {
                        if (name === "response_size") {
                          return [formatBytes(value), "Response Size"];
                        }
                        if (name === "dateTime" || name === "label") return null;
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
