import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import useApi from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Eye, RefreshCw, FileText, ExternalLink, AlertCircle, Loader2 } from 'lucide-react'; // Icons
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from 'date-fns'; // For formatting timestamp

// --- Dialog Components ---
const DeleteLogConfirmDialog = ({ logName, isOpen, onClose, onLogDeleted }) => {
     const { request, loading, error, setError } = useApi();

     const handleDelete = async () => {
         setError(null);
         try {
            await request(`/nginx/logs/${logName}`, { method: 'DELETE' });
            onLogDeleted(); // Trigger refresh in parent
            onClose();
         } catch (err) {
            console.error(`Failed to delete log ${logName}:`, err);
            // Error will be shown in the dialog temporarily or handled globally
         }
     };

     // Use the Dialog component from shadcn/ui
     return (
         <Dialog open={isOpen} onOpenChange={onClose}>
             <DialogContent className="bg-white dark:bg-gray-900">
                 <DialogHeader>
                     <DialogTitle>Confirm Deletion</DialogTitle>
                     <DialogDescription>
                          Are you sure you want to delete log file <strong>{logName}</strong>? This action cannot be undone.
                     </DialogDescription>
                 </DialogHeader>
                 {error && (
                      <Alert variant="destructive" className="mt-4">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Error</AlertTitle>
                          <AlertDescription>{error}</AlertDescription>
                      </Alert>
                  )}
                 <DialogFooter>
                     <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
                     <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                         {loading ? (
                             <>
                                 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                 Deleting...
                             </>
                         ) : 'Delete'}
                     </Button>
                 </DialogFooter>
             </DialogContent>
         </Dialog>
     );
 };
// --- End Placeholder Dialogs ---

// Helper to format bytes
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};


const LogsList = () => {
    const { request, error, setError } = useApi();
    const [logs, setLogs] = useState([]);
    const [isFetching, setIsFetching] = useState(false);

    // --- Dialog States ---
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [selectedLogName, setSelectedLogName] = useState(null); // Log name for delete

    // Fetch logs data
    const fetchLogs = useCallback(async () => {
        setIsFetching(true);
        setError(null);
        try {
            const data = await request('/nginx/logs');
            setLogs(data || []);
        } catch (err) {
            console.error("Failed to fetch logs:", err);
            setLogs([]);
        } finally {
            setIsFetching(false);
        }
    }, [request, setError]);

    // Initial fetch
    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    // --- Action Handlers ---
    // --- Action Handlers ---
    const handleOpenDelete = (logName) => { setSelectedLogName(logName); setIsDeleteOpen(true); };
    const handleCloseDialogs = () => {
        setIsDeleteOpen(false);
        setSelectedLogName(null);
    };

    const handleLogDeleted = () => {
        fetchLogs(); // Refresh list after delete
    };

    // --- Render Logic ---
    return (
        <TooltipProvider>
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Log Files</h2>
                     <Button onClick={fetchLogs} variant="outline" size="icon" disabled={isFetching}>
                         <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                     </Button>
                </div>

                 {error && !isFetching && (
                     <Alert className="mb-4">
                       <AlertTitle>Error</AlertTitle>
                       <AlertDescription>{error}</AlertDescription>
                     </Alert>
                 )}

                <Table>
                    <TableCaption>List of Nginx log files. {isFetching ? 'Loading...' : ''}</TableCaption>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Log Name</TableHead>
                            <TableHead>Size</TableHead>
                            <TableHead>Last Modified</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                         {isFetching ? (
                             // Skeleton Loader Rows
                             Array.from({ length: 3 }).map((_, index) => (
                                 <TableRow key={`skeleton-${index}`}>
                                     <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                                     <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                                     <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                                     <TableCell className="text-right space-x-2">
                                         <Skeleton className="h-8 w-8 inline-block" />
                                         <Skeleton className="h-8 w-8 inline-block" />
                                     </TableCell>
                                 </TableRow>
                             ))
                         ) : logs.length === 0 ? (
                             <TableRow>
                                 <TableCell colSpan={4} className="text-center">No log files found.</TableCell>
                             </TableRow>
                         ) : (
                             logs.map((log) => (
                                 <TableRow key={log.name}>
                                     <TableCell className="font-medium">{log.name}</TableCell>
                                     <TableCell>{formatBytes(log.size_bytes)}</TableCell>
                                     <TableCell>
                                         {log.last_modified ? format(new Date(log.last_modified * 1000), 'Pp') : 'N/A'}
                                     </TableCell>
                                     <TableCell className="text-right space-x-2">
                                         <Tooltip>
                                             <TooltipTrigger asChild>
                                                 <Button variant="ghost" size="icon" asChild>
                                                     <Link href={`/dashboard/nginx/logs/${log.name}`}>
                                                         <Eye className="h-4 w-4" />
                                                     </Link>
                                                 </Button>
                                             </TooltipTrigger>
                                             <TooltipContent><p>View Log</p></TooltipContent>
                                         </Tooltip>
                                         <Tooltip>
                                             <TooltipTrigger asChild>
                                                 <Button variant="ghost" size="icon" onClick={() => handleOpenDelete(log.name)}>
                                                     <Trash2 className="h-4 w-4" />
                                                 </Button>
                                             </TooltipTrigger>
                                             <TooltipContent><p>Delete Log</p></TooltipContent>
                                         </Tooltip>
                                     </TableCell>
                                 </TableRow>
                             ))
                         )}
                     </TableBody>
                </Table>

                 {/* Dialogs */}
                 {/* Dialogs */}
                 <DeleteLogConfirmDialog logName={selectedLogName} isOpen={isDeleteOpen} onClose={handleCloseDialogs} onLogDeleted={handleLogDeleted} />
            </div>
        </TooltipProvider>
    );
};

export default LogsList;