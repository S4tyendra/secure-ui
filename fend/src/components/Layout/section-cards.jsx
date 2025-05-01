import * as React from "react";
import { Activity, AlertCircle, ServerCrash, ShieldCheck, UploadCloud } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent, // Use CardContent for better structure
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Define types for props for clarity
// interface SectionCardsProps {
//   logData: Array<any>; // Replace 'any' with a more specific type if available
//   isLoading: boolean;
//   error: string | null;
//   chartConfig: Record<string, { label: string; color: string }>;
//   formatBytes: (bytes: number, decimals?: number) => string;
// }

export function SectionCards({
  logData = [],
  isLoading = true, // Default to loading
  error = null,
  chartConfig = {},
  formatBytes = (b) => `${b} Bytes` // Default formatter
}) {

  // Calculate aggregate metrics using useMemo
  const metrics = React.useMemo(() => {
    if (!logData || logData.length === 0) {
      return { totalRequests: 0, success: 0, clientErrors: 0, serverErrors: 0, totalBandwidth: 0 };
    }

    return logData.reduce(
      (acc, hourData) => {
        acc.success += hourData.status_2xx || 0;
        // 3xx are also technically requests, count them in total
        const redirects = hourData.status_3xx || 0;
        acc.clientErrors += hourData.status_4xx || 0;
        acc.serverErrors += hourData.status_5xx || 0;
        acc.totalBandwidth += hourData.response_size || 0;
        // Total requests = sum of all status counts for the hour
        acc.totalRequests += (hourData.status_2xx || 0) + redirects + (hourData.status_4xx || 0) + (hourData.status_5xx || 0);
        return acc;
      },
      { totalRequests: 0, success: 0, clientErrors: 0, serverErrors: 0, totalBandwidth: 0 }
    );
  }, [logData]);

  // Define card styles using chartConfig colors (provide fallbacks)
  const cardStyles = {
    requests: { iconColor: chartConfig.status_3xx?.color || "#3b82f6" }, // Use blue for general requests
    success: { iconColor: chartConfig.status_2xx?.color || "#22c55e" },
    clientError: { iconColor: chartConfig.status_4xx?.color || "#f97316" },
    serverError: { iconColor: chartConfig.status_5xx?.color || "#ef4444" },
    bandwidth: { iconColor: chartConfig.response_size?.color || "#8b5cf6" },
  };
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="@xl/main:grid-cols-2 @5xl/main:grid-cols-5 grid grid-cols-1 gap-4 px-4 lg:px-6">
        {Array.from({ length: 5 }).map((_, index) => ( // Render 5 skeletons
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

  // Show error state
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

  // Render cards with calculated metrics
  return (
     // Use 5 columns for the 5 metrics
    <div className="@xl/main:grid-cols-3 @5xl/main:grid-cols-5 grid grid-cols-1 gap-4 px-4 lg:px-6">
      {/* Total Requests Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" style={{ color: cardStyles.requests.iconColor }} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalRequests.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            From selected log over ~3 days
          </p>
        </CardContent>
      </Card>

       {/* Success (2xx) Card */}
       <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Successful Requests</CardTitle>
           <ShieldCheck className="h-4 w-4 text-muted-foreground" style={{ color: cardStyles.success.iconColor }}/>
        </CardHeader>
        <CardContent>
           <div className="text-2xl font-bold">{metrics.success.toLocaleString()}</div>
           <p className="text-xs text-muted-foreground">
             {metrics.totalRequests > 0 ? `${((metrics.success / metrics.totalRequests) * 100).toFixed(1)}%` : '0%'} success rate
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
             User/request related issues
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
            Server-side application issues
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
             Total data served
           </p>
        </CardContent>
      </Card>

    </div>
  );
}
