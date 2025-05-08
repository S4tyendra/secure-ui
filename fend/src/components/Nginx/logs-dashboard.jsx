"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LogsChart } from "@/components/Nginx/logs-chart"
import { LogsTable } from "@/components/Nginx/logs-table"
import { processLogs } from "@/lib/log-utils"
import useApi from "@/hooks/useApi"

export default function LogsDashboard() {
  const [logs, setLogs] = useState([])
  const [processedData, setProcessedData] = useState(null)
  const [batchSize, setBatchSize] = useState(10)
  const { request, loading, error } = useApi()

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await request('/nginx/structured/logs')
        setLogs(data)

        // Process the logs with the current batch size
        const processed = processLogs(data, batchSize)
        setProcessedData(processed)
      } catch (err) {
        console.error("Error fetching logs:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch logs")
      } finally {
        setIsLoading(false)
      }
    }

    fetchLogs()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchSize, request])

  const handleBatchSizeChange = (newSize) => {
    setBatchSize(newSize)
    if (logs.length > 0) {
      const processed = processLogs(logs, newSize)
      setProcessedData(processed)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">Loading logs...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="bg-destructive/10">
        <CardHeader>
          <CardTitle>Error Loading Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
          <button
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Status Code Distribution Over Time</CardTitle>
              <CardDescription>Visualizing HTTP status codes from {logs.length} log entries</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Batch Size:</span>
              <select
                className="px-2 py-1 rounded-md border border-input bg-background text-sm"
                value={batchSize}
                onChange={(e) => handleBatchSizeChange(Number(e.target.value))}
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {processedData && (
            <div className="h-[400px]">
              <LogsChart data={processedData.chartData} />
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="table">
        <TabsList className="mb-4">
          <TabsTrigger value="table">Detailed Logs</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="table">
          <Card>
            <CardHeader>
              <CardTitle>Log Entries</CardTitle>
              <CardDescription>Detailed view of all log entries</CardDescription>
            </CardHeader>
            <CardContent>
              <LogsTable logs={logs} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <CardTitle>Log Summary</CardTitle>
              <CardDescription>Summary statistics of log data</CardDescription>
            </CardHeader>
            <CardContent>
              {processedData && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <SummaryCard
                    title="2xx Responses"
                    value={processedData.totals.status2xx}
                    percentage={Math.round((processedData.totals.status2xx / logs.length) * 100)}
                    color="bg-green-100 text-green-800"
                  />
                  <SummaryCard
                    title="3xx Responses"
                    value={processedData.totals.status3xx}
                    percentage={Math.round((processedData.totals.status3xx / logs.length) * 100)}
                    color="bg-blue-100 text-blue-800"
                  />
                  <SummaryCard
                    title="4xx Responses"
                    value={processedData.totals.status4xx}
                    percentage={Math.round((processedData.totals.status4xx / logs.length) * 100)}
                    color="bg-amber-100 text-amber-800"
                  />
                  <SummaryCard
                    title="5xx Responses"
                    value={processedData.totals.status5xx}
                    percentage={Math.round((processedData.totals.status5xx / logs.length) * 100)}
                    color="bg-red-100 text-red-800"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SummaryCard({
  title,
  value,
  percentage,
  color,
}) {
  return (
    <div className={`p-4 rounded-lg ${color}`}>
      <h3 className="font-medium">{title}</h3>
      <div className="flex items-end justify-between mt-2">
        <span className="text-2xl font-bold">{value}</span>
        <span className="text-sm">{percentage}%</span>
      </div>
    </div>
  )
}
