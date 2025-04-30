import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios'; // Import axios for type checking
import useApi from '@/hooks/useApi';
import { LogInfo, LogActionStatus, ApiErrorData } from '@/types/api'; // Import ApiErrorData
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
    SortingState,
    getSortedRowModel,
} from "@tanstack/react-table";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Eye, Trash2 } from "lucide-react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter // Import DialogFooter
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';
import { format } from 'date-fns'; // For formatting date/time

const formatBytes = (bytes: number, decimals = 2): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

const NginxLogsPage = () => {
    const api = useApi();
    const [logs, setLogs] = useState<LogInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [isViewLogDialogOpen, setIsViewLogDialogOpen] = useState(false);
    const [viewingLog, setViewingLog] = useState<{ name: string; content: string; isLoading: boolean } | null>(null);

    const fetchLogs = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await api.get<LogInfo[]>('/nginx/logs');
            setLogs(response.data);
        } catch (error) {
            console.error("Failed to fetch logs:", error);
            setLogs([]);
        } finally {
            setIsLoading(false);
        }
    }, [api]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    // --- Action Handlers ---

    const handleViewLog = async (logName: string) => {
        setViewingLog({ name: logName, content: 'Loading...', isLoading: true });
        setIsViewLogDialogOpen(true);
        try {
             // Fetch last 100 lines by default, use 0 for full log if needed
            const response = await api.get<string>(`/nginx/logs/${logName}?tail=100`, {
                 responseType: 'text' // Expect plain text response
            });
            setViewingLog({ name: logName, content: response.data, isLoading: false });
        } catch (error) { // Remove 'any', handle error type below
            let errorMessage = `Failed to load log content for ${logName}.`;
            // Check if it's an AxiosError with response data
            if (axios.isAxiosError(error) && error.response?.data) {
                const errorData = error.response.data as ApiErrorData; // Use ApiErrorData type
                if (typeof errorData.detail === 'string') {
                    errorMessage = errorData.detail;
                } else if (typeof errorData.message === 'string') { // Check for custom message
                    errorMessage = errorData.message;
                } else if (typeof errorData === 'string') { // Sometimes the data itself is the error string
                     errorMessage = errorData;
                }
            } else if (error instanceof Error) {
                 errorMessage = error.message;
            }
            toast.error(errorMessage);
            console.error("View log error:", error);
             // Display a more user-friendly message in the dialog
             setViewingLog({ name: logName, content: `Error loading log. Details: ${errorMessage}`, isLoading: false });
        }
    };


    const handleDeleteLog = async (logName: string) => {
        const toastId = toast.loading(`Deleting log ${logName}...`);
        try {
            await api.delete<LogActionStatus>(`/nginx/logs/${logName}`);
            toast.success(`Log ${logName} deleted successfully.`, { id: toastId });
            fetchLogs(); // Refresh list
        } catch (error) {
            toast.error(`Failed to delete log ${logName}.`, { id: toastId });
            console.error("Delete log error:", error);
        }
    };

    // --- Table Columns ---
    const columns: ColumnDef<LogInfo>[] = useMemo(() => [
        {
            accessorKey: "name",
            header: ({ column }) => (
                 <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    Log Name <ArrowUpDown className="ml-2 h-4 w-4" />
                 </Button>
            ),
             cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>,
             enableSorting: true,
        },
        {
            accessorKey: "size_bytes",
             header: ({ column }) => (
                 <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className='justify-end w-full text-right'>
                     Size <ArrowUpDown className="ml-2 h-4 w-4" />
                 </Button>
            ),
            cell: ({ row }) => <div className="text-right">{formatBytes(row.getValue("size_bytes"))}</div>,
            enableSorting: true,
        },
        {
             accessorKey: "last_modified",
             header: ({ column }) => (
                 <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className='justify-end w-full text-right'>
                      Last Modified <ArrowUpDown className="ml-2 h-4 w-4" />
                 </Button>
             ),
             cell: ({ row }) => {
                 const timestamp = row.getValue("last_modified") as number;
                 // Multiply by 1000 for JS Date (expects milliseconds)
                 const date = new Date(timestamp * 1000);
                 return <div className="text-right">{format(date, "yyyy-MM-dd HH:mm:ss")}</div>;
             },
             enableSorting: true,
         },
        {
            id: "actions",
            header: () => <div className="text-right">Actions</div>,
            cell: ({ row }) => {
                 const log = row.original;
                 return (
                    <div className="text-right space-x-2">
                         <Button variant="outline" size="sm" onClick={() => handleViewLog(log.name)}>
                              <Eye className="mr-1 h-4 w-4" /> View Tail
                         </Button>
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                 <Button variant="destructive" size="sm">
                                     <Trash2 className="mr-1 h-4 w-4" /> Delete
                                 </Button>
                             </AlertDialogTrigger>
                             <AlertDialogContent>
                                 <AlertDialogHeader>
                                     <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                     <AlertDialogDescription>
                                         This action cannot be undone. This will permanently delete the log file <span className='font-semibold'>{log.name}</span>.
                                     </AlertDialogDescription>
                                 </AlertDialogHeader>
                                 <AlertDialogFooter>
                                     <AlertDialogCancel>Cancel</AlertDialogCancel>
                                     <AlertDialogAction onClick={() => handleDeleteLog(log.name)} className='bg-destructive hover:bg-destructive/90'>
                                          Delete Log
                                     </AlertDialogAction>
                                 </AlertDialogFooter>
                             </AlertDialogContent>
                         </AlertDialog>
                    </div>
                 );
            },
        },
    ], [api]); // Dependency on api for actions


    const table = useReactTable({
        data: logs,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center">
                 <h1 className="text-2xl font-semibold">Nginx Logs</h1>
                 {/* Add maybe a refresh button? */}
                 <Button variant="outline" onClick={fetchLogs} disabled={isLoading}>Refresh</Button>
            </div>

            {/* Table */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id} style={{ width: header.getSize() !== 150 ? `${header.getSize()}px` : undefined }}>
                                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                             <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">Loading logs...</TableCell></TableRow>
                        ) : table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} style={{ width: cell.column.getSize() !== 150 ? `${cell.column.getSize()}px` : undefined }}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No logs found.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* View Log Dialog */}
            <Dialog open={isViewLogDialogOpen} onOpenChange={(open) => { if (!open) setViewingLog(null); setIsViewLogDialogOpen(open); }}>
                 <DialogContent className="sm:max-w-[80vw] h-[80vh] flex flex-col"> {/* Large dialog */}
                      <DialogHeader>
                           <DialogTitle>View Log: {viewingLog?.name}</DialogTitle>
                           <DialogDescription>Showing last 100 lines (or error). Refresh page to see full log if needed.</DialogDescription>
                      </DialogHeader>
                       <ScrollArea className="flex-1 rounded-md border p-4 bg-muted/50">
                          <pre className='text-xs whitespace-pre-wrap break-words'>
                              {viewingLog?.isLoading ? 'Loading...' : viewingLog?.content}
                          </pre>
                       </ScrollArea>
                      <DialogFooter>
                           <DialogClose asChild>
                               <Button type="button" variant="outline">Close</Button>
                           </DialogClose>
                      </DialogFooter>
                 </DialogContent>
             </Dialog>
        </div>
    );
};

export default NginxLogsPage;