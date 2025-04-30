import React, { useState, useEffect, useCallback } from 'react';
import useApi from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Eye, RefreshCcw } from 'lucide-react'; // Icons
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // For icon hints
import { format } from 'date-fns'; // For formatting timestamp

// --- Placeholder Dialog Components ---
const ViewLogDialog = ({ logName, isOpen, onClose }) => {
    const { request, loading, error, setError } = useApi();
    const [logContent, setLogContent] = useState('');

    useEffect(() => {
        if (isOpen && logName) {
            const fetchLogContent = async () => {
                setError(null);
                setLogContent(''); // Clear previous content
                try {
                    // Fetch tail of log (e.g., last 100 lines) - returns text
                    const content = await request(`/nginx/logs/${logName}?tail=100`, {
                        headers: { 'Accept': 'text/plain' } // Ensure backend returns plain text
                    });
                    setLogContent(content || 'Log is empty or could not be read.');
                } catch (err) {
                    console.error(`Failed to fetch log content for ${logName}:`, err);
                     setLogContent(`Error loading log: ${error || err.message}`);
                }
            };
            fetchLogContent();
        }
    }, [isOpen, logName, request, setError, error]); // Add error to dependencies

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4">
            <div className="bg-white p-6 rounded shadow-lg w-full max-w-3xl h-3/4 flex flex-col">
                <h3 className="text-lg font-semibold mb-4">View Log: {logName} (Last 100 lines)</h3>
                <pre className="flex-1 overflow-auto bg-gray-900 text-gray-200 text-xs p-4 rounded mb-4">
                    {loading ? 'Loading log content...' : logContent}
                </pre>
                <Button onClick={onClose} variant="outline" className="self-end">Close</Button>
            </div>
        </div>
    );
};

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

     if (!isOpen || !logName) return null;

     return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
             <div className="bg-white p-6 rounded shadow-lg">
                 <h3 className="text-lg font-semibold mb-2">Confirm Deletion</h3>
                 <p className="mb-4">Are you sure you want to delete log file <strong>{logName}</strong>? This action cannot be undone.</p>
                 {error && (
                     <Alert variant="destructive" className="mb-4">
                       <AlertDescription>{error}</AlertDescription>
                     </Alert>
                 )}
                 <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                        {loading ? 'Deleting...' : 'Delete'}
                    </Button>
                 </div>
             </div>
         </div>
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
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [selectedLogName, setSelectedLogName] = useState(null); // Log name for view/delete

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
    const handleOpenView = (logName) => { setSelectedLogName(logName); setIsViewOpen(true); };
    const handleOpenDelete = (logName) => { setSelectedLogName(logName); setIsDeleteOpen(true); };

    const handleCloseDialogs = () => {
        setIsViewOpen(false);
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
                         <RefreshCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                     </Button>
                </div>

                 {error && !isFetching && (
                     <Alert variant="destructive" className="mb-4">
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
                        {logs.length === 0 && !isFetching ? (
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
                                                <Button variant="ghost" size="icon" onClick={() => handleOpenView(log.name)}>
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>View Log (Tail)</p></TooltipContent>
                                        </Tooltip>
                                         <Tooltip>
                                             <TooltipTrigger asChild>
                                                 <Button variant="ghost" size="icon"  onClick={() => handleOpenDelete(log.name)}>
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
                 <ViewLogDialog logName={selectedLogName} isOpen={isViewOpen} onClose={handleCloseDialogs} />
                 <DeleteLogConfirmDialog logName={selectedLogName} isOpen={isDeleteOpen} onClose={handleCloseDialogs} onLogDeleted={handleLogDeleted} />

            </div>
        </TooltipProvider>
    );
};

export default LogsList;