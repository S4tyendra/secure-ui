import * as React from "react";
import { Activity, AlertCircle, ServerCrash, ShieldCheck, UploadCloud, TrendingUpIcon, TrendingDownIcon } from "lucide-react"; // Added trend icons
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent, 
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";



export function SectionCards({
  logData = [],
  isLoading = true,
  error = null,
  chartConfig = {},
  formatBytes = (b) => `${b} Bytes` 
}) {

  const metrics = React.useMemo(() => {
    const defaultMetrics = {
      totalRequests: 0, success: 0, clientErrors: 0, serverErrors: 0, totalBandwidth: 0,
      requestsTrend: 0, successTrend: 0, clientErrorsTrend: 0, serverErrorsTrend: 0, bandwidthTrend: 0,
      historicalComparison: null
    };

    if (!logData || logData.length === 0) {
      return defaultMetrics;
    }
    
    // For 1000 lines of log data, split into two equal parts (500-500)
    // Last 500 entries for recent metrics
    // First 500 entries for historical baseline
    const dataPoints = logData.length;
    const halfPoint = Math.floor(dataPoints / 2);
    const recentData = logData.slice(-halfPoint); // Last 500 lines
    const historicalData = logData.slice(0, halfPoint); // First 500 lines

    const calculatePeriodMetrics = (data) => data.reduce((acc, hourData) => {
      acc.success += hourData.status_2xx || 0;
      const redirects = hourData.status_3xx || 0;
      acc.clientErrors += hourData.status_4xx || 0;
      acc.serverErrors += hourData.status_5xx || 0;
      acc.totalBandwidth += hourData.response_size || 0;
      acc.totalRequests += (hourData.status_2xx || 0) + redirects + (hourData.status_4xx || 0) + (hourData.status_5xx || 0);
      return acc;
    }, { totalRequests: 0, success: 0, clientErrors: 0, serverErrors: 0, totalBandwidth: 0 });

    const recentMetrics = calculatePeriodMetrics(recentData);
    const historicalMetrics = calculatePeriodMetrics(historicalData);
    
    // Normalize metrics for comparison (per hour rates)
    const normalizeMetrics = (metrics, dataLength) => ({
      requestsPerHour: metrics.totalRequests / dataLength,
      successPerHour: metrics.success / dataLength,
      clientErrorsPerHour: metrics.clientErrors / dataLength,
      serverErrorsPerHour: metrics.serverErrors / dataLength,
      bandwidthPerHour: metrics.totalBandwidth / dataLength
    });

    const recentNormalized = normalizeMetrics(recentMetrics, recentData.length);
    const historicalNormalized = normalizeMetrics(historicalMetrics, historicalData.length);

    const totals = calculatePeriodMetrics(logData);

    let trends = { requestsTrend: 0, successTrend: 0, clientErrorsTrend: 0, serverErrorsTrend: 0, bandwidthTrend: 0 };
    
    // Calculate trends based on historical comparison
    const calculateTrend = (current, previous) => {
      if (previous === 0) {
        return current > 0 ? 100 : 0;
      }
      return ((current - previous) / previous) * 100;
    };

    if (historicalData.length > 0 && recentData.length > 0) {
      // Calculate trends using normalized rates
      trends.requestsTrend = calculateTrend(recentNormalized.requestsPerHour, historicalNormalized.requestsPerHour);
      trends.successTrend = calculateTrend(recentNormalized.successPerHour, historicalNormalized.successPerHour);
      trends.clientErrorsTrend = calculateTrend(recentNormalized.clientErrorsPerHour, historicalNormalized.clientErrorsPerHour);
      trends.serverErrorsTrend = calculateTrend(recentNormalized.serverErrorsPerHour, historicalNormalized.serverErrorsPerHour);
      trends.bandwidthTrend = calculateTrend(recentNormalized.bandwidthPerHour, historicalNormalized.bandwidthPerHour);
    }
    
    return { ...totals, ...trends };

  }, [logData]);

  const renderTrend = (trendValue) => {
    // Don't show trends if we don't have enough data
    if (!trendValue) {
      return null;
    }

    const value = trendValue.toFixed(1);
    const isPositive = trendValue > 0;
    const isNegative = trendValue < 0;
    const Icon = isPositive ? TrendingUpIcon : isNegative ? TrendingDownIcon : null; 
    const colorClass = isPositive ? "text-green-600" : isNegative ? "text-red-600" : "text-muted-foreground";
    const sign = isPositive ? "+" : ""; 

    return (
      <span className={`ml-2 inline-flex items-center text-xs ${colorClass}`}>
         {Icon && <Icon className="h-3 w-3 mr-0.5" />}
         {sign}{value}% vs historical
      </span>
    );
  };
  const cardStyles = {
    requests: { iconColor: chartConfig.status_3xx?.color || "#3b82f6" }, 
    success: { iconColor: chartConfig.status_2xx?.color || "#22c55e" },
    clientError: { iconColor: chartConfig.status_4xx?.color || "#f97316" },
    serverError: { iconColor: chartConfig.status_5xx?.color || "#ef4444" },
    bandwidth: { iconColor: chartConfig.response_size?.color || "#8b5cf6" },
  };
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="@xl/main:grid-cols-2 @5xl/main:grid-cols-5 grid grid-cols-1 gap-4 px-4 lg:px-6">
        {Array.from({ length: 5 }).map((_, index) => ( 
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-8 w-1/3 mt-1" />
            </CardHeader>
            <CardContent>
               <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
     return (
       <div className="px-4 lg:px-6">
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Metrics</AlertTitle>
            <AlertDescription>{typeof error === 'string' ? error : JSON.stringify(error)}</AlertDescription>
          </Alert>
        </div>
     )
  }

  return (
    <div className="@xl/main:grid-cols-3 @5xl/main:grid-cols-5 grid grid-cols-1 gap-4 px-4 lg:px-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" style={{ color: cardStyles.requests.iconColor }} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalRequests.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            Last 500 vs previous 500 {renderTrend(metrics.requestsTrend)}
          </p>
        </CardContent>
      </Card>

       {/* Success (2xx) Card */}
       <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Successful Requests (2xx)</CardTitle>
           <ShieldCheck className="h-4 w-4 text-muted-foreground" style={{ color: cardStyles.success.iconColor }}/>
        </CardHeader>
        <CardContent>
           <div className="text-2xl font-bold">
             {metrics.success.toLocaleString()}
             <span className="text-sm ml-2 text-muted-foreground">
               ({metrics.totalRequests > 0 ? `${((metrics.success / metrics.totalRequests) * 100).toFixed(1)}%` : '0%'})
             </span>
           </div>
           <p className="text-xs text-muted-foreground">
             Success rate comparison {renderTrend(metrics.successTrend)}
           </p>
        </CardContent>
        </Card>

      {/* Client Errors (4xx) Card */}
       <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Client Errors (4xx)</CardTitle>
           <AlertCircle className="h-4 w-4 text-muted-foreground" style={{ color: cardStyles.clientError.iconColor }}/>
        </CardHeader>
        <CardContent>
           <div className="text-2xl font-bold">{metrics.clientErrors.toLocaleString()}</div>
           <p className="text-xs text-muted-foreground">
             {metrics.totalRequests > 0 ? `${((metrics.clientErrors / metrics.totalRequests) * 100).toFixed(1)}%` : '0%'} of total requests {renderTrend(metrics.clientErrorsTrend)}
           </p>
        </CardContent>
      </Card>

       {/* Server Errors (5xx) Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Server Errors (5xx)</CardTitle>
           <ServerCrash className="h-4 w-4 text-muted-foreground" style={{ color: cardStyles.serverError.iconColor }}/>
        </CardHeader>
        <CardContent>
           <div className="text-2xl font-bold">{metrics.serverErrors.toLocaleString()}</div>
           <p className="text-xs text-muted-foreground">
             {metrics.totalRequests > 0 ? `${((metrics.serverErrors / metrics.totalRequests) * 100).toFixed(1)}%` : '0%'} of total requests {renderTrend(metrics.serverErrorsTrend)}
           </p>
        </CardContent>
      </Card>

       {/* Total Bandwidth Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Bandwidth</CardTitle>
           <UploadCloud className="h-4 w-4 text-muted-foreground" style={{ color: cardStyles.bandwidth.iconColor }}/>
        </CardHeader>
        <CardContent>
           <div className="text-2xl font-bold">{formatBytes(metrics.totalBandwidth)}</div>
           <p className="text-xs text-muted-foreground">
              Average per request: {formatBytes(metrics.totalBandwidth / metrics.totalRequests)} {renderTrend(metrics.bandwidthTrend)}
            </p>
        </CardContent>
      </Card>

    </div>
  );
}
