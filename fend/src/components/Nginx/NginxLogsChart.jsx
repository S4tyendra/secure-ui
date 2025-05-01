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
  const { request, loading, error, setError } = useApi();
  const [logs, setLogs] = React.useState([]);
  const [selectedLog, setSelectedLog] = React.useState(null);
  const [logData, setLogData] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(false);

  // Chart configuration - using HTTP status codes as categories
  const chartConfig = {
    status_2xx: {
      label: " 2xx Success",
      color: "#22c55e", // Green
    },
    status_3xx: {
      label: " 3xx Redirection",
      color: "#3b82f6", // Blue
    },
    status_4xx: {
      label: " 4xx Client Error",
      color: "#f97316", // Orange
    },
    status_5xx: {
      label: " 5xx Server Error",
      color: "#ef4444", // Red
    },
    response_size: {
      label: " Response Size",
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
      
      // Select 'access.log' if available, otherwise the largest non-gz log file
      if (data && data.length > 0) {
        const accessLog = data.find(log => log.name === 'access.log');
        let logToSelect = null;

        if (accessLog) {
          logToSelect = accessLog;
        } else {
          // Fallback to largest non-gz log if access.log is not found
          const filteredLogs = data.filter(log => !log.name.endsWith('.gz'));
          if (filteredLogs.length > 0) {
            logToSelect = filteredLogs.reduce((prev, current) =>
              (prev.size_bytes > current.size_bytes) ? prev : current
            );
          }
        }

        if (logToSelect) {
          setSelectedLog(logToSelect);
          // Fetch structured data for this log
          fetchStructuredData(logToSelect.name);
        } else {
            // Handle case where no suitable log file is found
            setError("No suitable log file found (access.log or other non-gzipped log).");
            setLogs([]); // Clear logs if none are suitable
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
      // Fetch data for the last 3 days by default
      const data = await request(`/nginx/structured/logs`);
      
      // Process the data for the chart
      const processedData = processLogsData(data || []);
      setLogData(processedData);
    } catch (err) {
      console.error(`Failed to fetch structured data for log ${logName}:`, err);
      setLogData([]);
    } finally {
      setIsLoading(false);
    }
  }, [request, setError]);

  // Process log data for the chart
  const processLogsData = (data) => {
    const groupedByHour = data.reduce((acc, entry) => {
      try {
        const timestamp = new Date(entry.timestamp);
        // Create a key representing the start of the hour (e.g., '2025-05-01T13:00:00.000Z')
        const dateHourKey = new Date(
          timestamp.getFullYear(),
          timestamp.getMonth(),
          timestamp.getDate(),
          timestamp.getHours()
        ).toISOString();

        if (!acc[dateHourKey]) {
          acc[dateHourKey] = {
            dateTime: dateHourKey, // Store the ISO string key for sorting
            label: "", // Will format later
            status_2xx: 0,
            status_3xx: 0,
            status_4xx: 0,
            status_5xx: 0,
            response_size: 0
          };
        }

        const hourSlot = acc[dateHourKey];
        const statusCode = entry.status_code;

        // Update counts based on status code
        if (statusCode >= 200 && statusCode < 300) {
          hourSlot.status_2xx += 1;
        } else if (statusCode >= 300 && statusCode < 400) {
          hourSlot.status_3xx += 1;
        } else if (statusCode >= 400 && statusCode < 500) {
          hourSlot.status_4xx += 1;
        } else if (statusCode >= 500) {
          hourSlot.status_5xx += 1;
        }
        
        // Sum response sizes for the hour
        hourSlot.response_size += entry.response_size;

      } catch (e) {
        console.error("Error processing timestamp for entry:", entry, e);
      }
      return acc;
    }, {});

    // Convert to array, format label, and sort
    const chartData = Object.values(groupedByHour)
      .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime)) // Sort chronologically
      .map(item => {
        const dt = new Date(item.dateTime);
        // Format label like "May 1 13:00"
        item.label = dt.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false // Use 24-hour format
        }).replace(",", ""); // Remove comma after day
        return item;
      });

    return chartData;
  };

  // Effect to initialize
  React.useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

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
          
          {/* Time range selection removed */}
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
