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

export function NginxLogsChart() {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("30d")
  const { request, loading, error, setError } = useApi();
  const [logs, setLogs] = React.useState([]);
  const [selectedLog, setSelectedLog] = React.useState(null);
  const [logData, setLogData] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(false);

  // Chart configuration - using HTTP status codes as categories
  const chartConfig = {
    status_2xx: {
      label: "2xx Success",
      color: "#22c55e", // Green
    },
    status_3xx: {
      label: "3xx Redirection",
      color: "#3b82f6", // Blue
    },
    status_4xx: {
      label: "4xx Client Error",
      color: "#f97316", // Orange
    },
    status_5xx: {
      label: "5xx Server Error",
      color: "#ef4444", // Red
    },
    response_size: {
      label: "Response Size",
      color: "#8b5cf6", // Purple
    }
  }

  // Function to fetch logs list
  const fetchLogs = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await request('/nginx/logs');
      setLogs(data || []);
      
      // Select the largest non-gz log file
      if (data && data.length > 0) {
        const filteredLogs = data.filter(log => !log.name.endsWith('.gz'));
        if (filteredLogs.length > 0) {
          const largestLog = filteredLogs.reduce((prev, current) => 
            (prev.size_bytes > current.size_bytes) ? prev : current
          );
          setSelectedLog(largestLog);
          // Fetch structured data for this log
          fetchStructuredData(largestLog.name);
        }
      }
    } catch (err) {
      console.error("Failed to fetch logs:", err);
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [request, setError]);

  // Function to fetch structured data for a log file
  const fetchStructuredData = React.useCallback(async (logName) => {
    setIsLoading(true);
    setError(null);
    try {
      // Get number of days based on timeRange
      let days = 30;
      if (timeRange === "7d") days = 7;
      if (timeRange === "90d") days = 90;
      
      const data = await request(`/nginx/logs/${logName}/structured?days=${days}`);
      
      // Process the data for the chart
      const processedData = processLogsData(data || []);
      setLogData(processedData);
    } catch (err) {
      console.error(`Failed to fetch structured data for log ${logName}:`, err);
      setLogData([]);
    } finally {
      setIsLoading(false);
    }
  }, [request, setError, timeRange]);

  // Process log data for the chart
  const processLogsData = (data) => {
    // Group data by date
    const groupedByDate = data.reduce((acc, entry) => {
      // Create date groups
      if (!acc[entry.date]) {
        acc[entry.date] = {
          date: entry.date,
          status_2xx: 0,
          status_3xx: 0,
          status_4xx: 0,
          status_5xx: 0,
          response_size: 0
        };
      }
      
      // Update counts based on status code
      const statusCode = entry.status_code;
      if (statusCode >= 200 && statusCode < 300) {
        acc[entry.date].status_2xx += 1;
      } else if (statusCode >= 300 && statusCode < 400) {
        acc[entry.date].status_3xx += 1;
      } else if (statusCode >= 400 && statusCode < 500) {
        acc[entry.date].status_4xx += 1;
      } else if (statusCode >= 500) {
        acc[entry.date].status_5xx += 1;
      }
      
      // Sum response sizes for the day
      acc[entry.date].response_size += entry.response_size;
      
      return acc;
    }, {});
    
    // Convert to array and sort by date
    const chartData = Object.values(groupedByDate).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );
    
    return chartData;
  };

  // Effect to initialize
  React.useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Effect to update data when timeRange changes
  React.useEffect(() => {
    if (selectedLog) {
      fetchStructuredData(selectedLog.name);
    }
  }, [timeRange, selectedLog, fetchStructuredData]);

  // Effect to handle mobile view
  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d");
    }
  }, [isMobile]);

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
          
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="@[767px]/card:flex hidden"
          >
            <ToggleGroupItem value="90d" className="h-8 px-2.5">
              Last 90 days
            </ToggleGroupItem>
            <ToggleGroupItem value="30d" className="h-8 px-2.5">
              Last 30 days
            </ToggleGroupItem>
            <ToggleGroupItem value="7d" className="h-8 px-2.5">
              Last 7 days
            </ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="@[767px]/card:hidden flex w-40"
              aria-label="Select time range"
            >
              <SelectValue placeholder="Last 30 days" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Last 90 days
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
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
            config={chartConfig}
            className="aspect-auto h-[350px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={logData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  {Object.entries(chartConfig).map(([key, config]) => (
                    <linearGradient key={key} id={`fill${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={config.color} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={config.color} stopOpacity={0.1} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });
                  }}
                />
                <YAxis />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => {
                        return new Date(value).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric"
                        });
                      }}
                      formatter={(value, name) => {
                        if (name === "response_size") {
                          return [formatBytes(value), "Response Size"];
                        }
                        return [value, chartConfig[name]?.label || name];
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
                  stroke={chartConfig.status_2xx.color}
                  fill={`url(#fillstatus_2xx)`}
                />
                <Area
                  type="monotone"
                  dataKey="status_3xx"
                  stackId="1"
                  stroke={chartConfig.status_3xx.color}
                  fill={`url(#fillstatus_3xx)`}
                />
                <Area
                  type="monotone"
                  dataKey="status_4xx"
                  stackId="1"
                  stroke={chartConfig.status_4xx.color}
                  fill={`url(#fillstatus_4xx)`}
                />
                <Area
                  type="monotone"
                  dataKey="status_5xx"
                  stackId="1"
                  stroke={chartConfig.status_5xx.color}
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
