import * as React from "react";
import useApi from "@/hooks/useApi";
import { SectionCards } from "@/components/Layout/section-cards";
import LogsDashboard from "@/components/Nginx/logs-dashboard"


const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0 || !bytes) return '0 Bytes';
  if (isNaN(bytes)) return 'NaN Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
   if (bytes < 1 && bytes > 0) return bytes.toFixed(dm) + ' Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(k));
   const index = Math.max(0, Math.min(i, sizes.length - 1));
  return parseFloat((bytes / Math.pow(k, index)).toFixed(dm)) + ' ' + sizes[index];
};


const processLogsData = (data) => {
    // Sort data by timestamp first to ensure correct processing
    data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Take first and last entries for smart scaling
    const firstEntry = data[0];
    const lastEntry = data[data.length - 1];
    const totalTimespan = new Date(lastEntry.timestamp) - new Date(firstEntry.timestamp);
    
    // Calculate optimal hour grouping based on timespan
    const hours = Math.ceil(totalTimespan / (1000 * 60 * 60));
    const groupingHours = Math.max(1, Math.floor(hours / 24)); // Aim for roughly 24 data points
    
    const groupedByHour = data.reduce((acc, entry) => {
      try {
        const timestamp = new Date(entry.timestamp);
        // Group by multiple hours if needed
        const roundedHours = Math.floor(timestamp.getHours() / groupingHours) * groupingHours;
        const dateHourKey = new Date(
          timestamp.getFullYear(),
          timestamp.getMonth(),
          timestamp.getDate(),
          roundedHours
        ).toISOString();

        if (!acc[dateHourKey]) {
          acc[dateHourKey] = {
            dateTime: dateHourKey,
            label: "",
            status_2xx: 0,
            status_3xx: 0,
            status_4xx: 0,
            status_5xx: 0,
            response_size: 0
          };
        }

        const hourSlot = acc[dateHourKey];
        const statusCode = entry.status_code;

        if (statusCode >= 200 && statusCode < 300) {
          hourSlot.status_2xx += 1;
        } else if (statusCode >= 300 && statusCode < 400) {
          hourSlot.status_3xx += 1;
        } else if (statusCode >= 400 && statusCode < 500) {
          hourSlot.status_4xx += 1;
        } else if (statusCode >= 500) {
          hourSlot.status_5xx += 1;
        }
        
        hourSlot.response_size += Number(entry.response_size) || 0;

      } catch (e) {
        console.error("Error processing timestamp for entry:", entry, e);
      }
      return acc;
    }, {});

    const chartData = Object.values(groupedByHour)
      .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime))
      .map(item => {
        const dt = new Date(item.dateTime);
        item.label = dt.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false
        }).replace(",", "");
        return item;
      });

    return chartData;
};


export default function Page() {
  const { request, loading: apiLoading, error: apiError, setError } = useApi();
  const [logs, setLogs] = React.useState([]);
  const [selectedLog, setSelectedLog] = React.useState(null);
  const [logData, setLogData] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(false);

   const chartConfig = {
    status_2xx: { label: " 2xx Success", color: "#22c55e" },
    status_3xx: { label: " 3xx Redirection", color: "#3b82f6" },
    status_4xx: { label: " 4xx Client Error", color: "#f97316" },
    status_5xx: { label: " 5xx Server Error", color: "#ef4444" },
    response_size: { label: " Response Size", color: "#8b5cf6" }
  };


  const fetchStructuredData = React.useCallback(async (logName) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await request(`/nginx/structured/logs`);
      const processedData = processLogsData(data || []);
      setLogData(processedData);
    } catch (err) {
      console.error(`Failed to fetch structured data for log ${logName}:`, err);
       setError(err?.message || `Failed to fetch structured data for log ${logName}`);
      setLogData([]);
    } finally {
      setIsLoading(false);
    }
  }, [request, setError]); 


  const fetchLogs = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSelectedLog(null);
    setLogData([]);
    try {
      const data = await request('/nginx/logs');
      setLogs(data || []);
      
      if (data && data.length > 0) {
        const accessLog = data.find(log => log.name === 'access.log');
        let logToSelect = null;

        if (accessLog) {
          logToSelect = accessLog;
        } else {
          const filteredLogs = data.filter(log => !log.name.endsWith('.gz'));
          if (filteredLogs.length > 0) {
            logToSelect = filteredLogs.reduce((prev, current) =>
              (prev.size_bytes > current.size_bytes) ? prev : current
            );
          }
        }

        if (logToSelect) {
          setSelectedLog(logToSelect);
          await fetchStructuredData(logToSelect.name);
        } else {
          setError("No suitable log file found (access.log or other non-gzipped log).");
          setLogs([]);
        }
      } else {
         setError("No log files found.");
      }
    } catch (err) {
      console.error("Failed to fetch logs:", err);
       setError(err?.message || "Failed to fetch logs list.");
      setLogs([]);
    } finally {
       if (!selectedLog) {
         setIsLoading(false);
       }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request, setError, fetchStructuredData]);


  React.useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const combinedIsLoading = isLoading || apiLoading;
  const combinedError = apiError;


  return (
    <>
      <SectionCards
          logData={logData}
          isLoading={combinedIsLoading}
          error={combinedError}
          chartConfig={chartConfig}
          formatBytes={formatBytes}
       />
      <div className="px-4 lg:px-6 mt-6">
        <LogsDashboard />
      </div>
    </>
  );
}
