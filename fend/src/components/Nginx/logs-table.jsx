"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronDown, ChevronUp, Filter, Search } from "lucide-react"
import { formatDateTime } from "@/lib/log-utils"



export function LogsTable({ logs }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState("timestamp")
  const [sortDirection, setSortDirection] = useState("desc")
  const [statusFilter, setStatusFilter] = useState(null)
  const [methodFilter, setMethodFilter] = useState(null)

  const itemsPerPage = 10

  // Filter logs based on search term and filters
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      searchTerm === "" ||
      Object.values(log).some(
        (value) => value !== null && value.toString().toLowerCase().includes(searchTerm.toLowerCase()),
      )

    const matchesStatus = statusFilter === null || log.status_code.toString().startsWith(statusFilter)

    const matchesMethod = methodFilter === null || log.method === methodFilter

    return matchesSearch && matchesStatus && matchesMethod
  })

  // Sort logs
  const sortedLogs = [...filteredLogs].sort((a, b) => {
    const aValue = a[sortField]
    const bValue = b[sortField]

    if (aValue === null) return sortDirection === "asc" ? -1 : 1
    if (bValue === null) return sortDirection === "asc" ? 1 : -1

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
    return 0
  })

  // Paginate logs
  const totalPages = Math.ceil(sortedLogs.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedLogs = sortedLogs.slice(startIndex, startIndex + itemsPerPage)

  // Get unique methods for filtering
  const methods = Array.from(new Set(logs.map((log) => log.method)))

  const handleSort = (field) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const getStatusClass = (status) => {
    if (status >= 200 && status < 300) return "bg-green-100 text-green-800"
    if (status >= 300 && status < 400) return "bg-blue-100 text-blue-800"
    if (status >= 400 && status < 500) return "bg-amber-100 text-amber-800"
    if (status >= 500) return "bg-red-100 text-red-800"
    return ""
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
          />
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-10">
                <Filter className="mr-2 h-4 w-4" />
                Status
                {statusFilter && <span className="ml-1">: {statusFilter}xx</span>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setStatusFilter(null)}>All</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("2")}>2xx</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("3")}>3xx</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("4")}>4xx</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("5")}>5xx</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-10">
                <Filter className="mr-2 h-4 w-4" />
                Method
                {methodFilter && <span className="ml-1">: {methodFilter}</span>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setMethodFilter(null)}>All</DropdownMenuItem>
              {methods.map((method) => (
                <DropdownMenuItem key={method} onClick={() => setMethodFilter(method)}>
                  {method}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px] cursor-pointer" onClick={() => handleSort("timestamp")}>
                <div className="flex items-center">
                  Timestamp
                  {sortField === "timestamp" &&
                    (sortDirection === "asc" ? (
                      <ChevronUp className="ml-1 h-4 w-4" />
                    ) : (
                      <ChevronDown className="ml-1 h-4 w-4" />
                    ))}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("ip")}>
                <div className="flex items-center">
                  IP
                  {sortField === "ip" &&
                    (sortDirection === "asc" ? (
                      <ChevronUp className="ml-1 h-4 w-4" />
                    ) : (
                      <ChevronDown className="ml-1 h-4 w-4" />
                    ))}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("method")}>
                <div className="flex items-center">
                  Method
                  {sortField === "method" &&
                    (sortDirection === "asc" ? (
                      <ChevronUp className="ml-1 h-4 w-4" />
                    ) : (
                      <ChevronDown className="ml-1 h-4 w-4" />
                    ))}
                </div>
              </TableHead>
              <TableHead>Path</TableHead>
              <TableHead className="text-center cursor-pointer" onClick={() => handleSort("status_code")}>
                <div className="flex items-center justify-center">
                  Status
                  {sortField === "status_code" &&
                    (sortDirection === "asc" ? (
                      <ChevronUp className="ml-1 h-4 w-4" />
                    ) : (
                      <ChevronDown className="ml-1 h-4 w-4" />
                    ))}
                </div>
              </TableHead>
              <TableHead className="text-right">Size</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedLogs.length > 0 ? (
              paginatedLogs.map((log, index) => (
                <TableRow key={`${log.timestamp}-${index}`}>
                  <TableCell className="font-mono text-xs">{formatDateTime(log.timestamp)}</TableCell>
                  <TableCell className="font-mono text-xs">{log.ip}</TableCell>
                  <TableCell>{log.method}</TableCell>
                  <TableCell
                    className="max-w-[200px] truncate"
                    title={`${log.path}${log.query ? `?${log.query}` : ""}`}
                  >
                    {log.path}
                    {log.query ? `?${log.query}` : ""}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusClass(log.status_code)}`}>
                      {log.status_code}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">{log.response_size} B</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredLogs.length)} of {filteredLogs.length}{" "}
            entries
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <div className="text-sm">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
