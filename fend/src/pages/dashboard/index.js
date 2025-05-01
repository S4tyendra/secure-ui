import * as React from "react";
import useApi from "@/hooks/useApi"; // Import useApi hook
import { SectionCards } from "@/components/Layout/section-cards";
import { NginxLogsChart } from "@/components/Nginx/NginxLogsChart";

// Helper function to format bytes (can be moved to a utils file later)
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0 || !bytes) return '0 Bytes'; // Add check for null/undefined
  if (isNaN(bytes)) return 'NaN Bytes'; // Add check for NaN
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
   // Handle edge case where bytes is less than 1 but not 0
   if (bytes < 1 && bytes > 0) return bytes.toFixed(dm) + ' Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(k));
   // Ensure i is within the bounds of the sizes array
   const index = Math.max(0, Math.min(i, sizes.length - 1));
  return parseFloat((bytes / Math.pow(k, index)).toFixed(dm)) + ' ' + sizes[index];
};


// Process log data for the chart (moved from NginxLogsChart)
const processLogsData = (data) => {
    const groupedByHour = data.reduce((acc, entry) => {
      try {
        const timestamp = new Date(entry.timestamp);
        const dateHourKey = new Date(
          timestamp.getFullYear(),
          timestamp.getMonth(),
          timestamp.getDate(),
          timestamp.getHours()
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
        
        // Ensure response_size is a number before adding
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
  const [isLoading, setIsLoading] = React.useState(false); // Combined loading state

  // Chart configuration (moved from NginxLogsChart)
   const chartConfig = {
    status_2xx: { label: " 2xx Success", color: "#22c55e" }, // Green
    status_3xx: { label: " 3xx Redirection", color: "#3b82f6" }, // Blue
    status_4xx: { label: " 4xx Client Error", color: "#f97316" }, // Orange
    status_5xx: { label: " 5xx Server Error", color: "#ef4444" }, // Red
    response_size: { label: " Response Size", color: "#8b5cf6" } // Purple
  };


  // Function to fetch structured data (moved from NginxLogsChart)
  const fetchStructuredData = React.useCallback(async (logName) => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch data for the last 3 days by default
      const data = await request(`/nginx/structured/logs`);
      const processedData = processLogsData(data || []);
      setLogData(processedData);
    } catch (err) {
      console.error(`Failed to fetch structured data for log ${logName}:`, err);
       // Propagate error from useApi or set a generic one
       setError(err?.message || `Failed to fetch structured data for log ${logName}`);
      setLogData([]);
    } finally {
      setIsLoading(false);
    }
  }, [request, setError]); // Added setError dependency


  // Function to fetch logs list (moved from NginxLogsChart)
  const fetchLogs = React.useCallback(async () => {
    setIsLoading(true); // Set combined loading state
    setError(null);
    setSelectedLog(null); // Reset selection
    setLogData([]); // Clear previous data
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
          // Fetch structured data immediately after selecting the log
          await fetchStructuredData(logToSelect.name); // Await this call
        } else {
          setError("No suitable log file found (access.log or other non-gzipped log).");
          setLogs([]);
        }
      } else {
         setError("No log files found."); // Handle case where no logs are returned
      }
    } catch (err) {
      console.error("Failed to fetch logs:", err);
       // Propagate error from useApi or set a generic one
       setError(err?.message || "Failed to fetch logs list.");
      setLogs([]);
    } finally {
      // Loading state is handled within fetchStructuredData now if a log is selected
       if (!selectedLog) { // Only set loading false if no log was selected to fetch data for
         setIsLoading(false);
       }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request, setError, fetchStructuredData]); // Add fetchStructuredData dependency


   // Effect to initialize on mount
  React.useEffect(() => {
    fetchLogs();
  }, [fetchLogs]); // fetchLogs is memoized, so this runs once on mount

  // Combine loading states
  const combinedIsLoading = isLoading || apiLoading;
  const combinedError = apiError;


  return (
    <>
      {/* Pass data and loading/error states to SectionCards */}
      <SectionCards
          logData={logData}
          isLoading={combinedIsLoading}
          error={combinedError}
          chartConfig={chartConfig}
          formatBytes={formatBytes}
       />
      <div className="px-4 lg:px-6 mt-6"> {/* Add some margin top */}
        {/* Pass data, loading/error states, config, and refresh function to NginxLogsChart */}
        <NginxLogsChart
            logData={logData}
            isLoading={combinedIsLoading}
            error={combinedError}
            selectedLog={selectedLog}
            chartConfig={chartConfig}
            fetchLogs={fetchLogs} // Pass the refresh function
         />
      </div>
    </>
  );
}
