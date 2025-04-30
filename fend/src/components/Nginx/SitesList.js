import React, { useState, useEffect, useCallback } from 'react';
import useApi from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge"; // For enabled/disabled status
import { Switch } from "@/components/ui/switch"; // For enable/disable toggle
import { Trash2, Edit, PlusCircle, Eye, RefreshCcw } from 'lucide-react'; // Icons
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // For errors
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // For icon hints

// --- Placeholder Dialog Components ---
// These would typically be Shadcn Dialog components implemented separately
const CreateSiteDialog = ({ isOpen, onClose, onSiteCreated }) => {
    if (!isOpen) return null;
    return <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center"> <div className="bg-white p-6 rounded shadow-lg"> Create Site Dialog <Button onClick={onClose}>Close</Button> </div> </div>;
};
const EditSiteDialog = ({ site, isOpen, onClose, onSiteUpdated }) => {
     if (!isOpen || !site) return null;
     return <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center"> <div className="bg-white p-6 rounded shadow-lg"> Edit Site: {site.name} <Button onClick={onClose}>Close</Button> </div> </div>;
 };
const ViewSiteDialog = ({ site, isOpen, onClose }) => {
     if (!isOpen || !site) return null;
     return <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center"> <div className="bg-white p-6 rounded shadow-lg"> View Site: {site.name} <pre className="mt-2 bg-gray-100 p-2 rounded text-sm">{site.content || 'No content available'}</pre> <Button onClick={onClose}>Close</Button> </div> </div>;
 };
const DeleteSiteConfirmDialog = ({ siteName, isOpen, onClose, onSiteDeleted }) => {
     if (!isOpen || !siteName) return null;
     return <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center"> <div className="bg-white p-6 rounded shadow-lg"> Delete Site: {siteName}? <Button variant="destructive" onClick={() => { /* onSiteDeleted(); */ onClose(); }}>Confirm</Button> <Button onClick={onClose}>Cancel</Button> </div> </div>;
 };
// --- End Placeholder Dialogs ---


const SitesList = () => {
    const { request, loading, error, setError } = useApi();
    const [sites, setSites] = useState([]);
    const [isFetching, setIsFetching] = useState(false); // Specific loading state for fetch

    // --- Dialog States ---
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [selectedSite, setSelectedSite] = useState(null); // Site for edit/view/delete

    // Fetch sites data
    const fetchSites = useCallback(async () => {
        setIsFetching(true);
        setError(null);
        try {
            // Fetch details for each site individually to get content (can be slow for many sites)
            // Alternative: Backend returns content in the list endpoint if feasible
            const siteListData = await request('/nginx/sites');
            if (siteListData && Array.isArray(siteListData)) {
                const sitesWithDetails = await Promise.all(
                     siteListData.map(async (site) => {
                        try {
                             // Fetch detailed info including content
                             const detailedSite = await request(`/nginx/sites/${site.name}`);
                             return detailedSite;
                        } catch (detailError) {
                             console.error(`Failed to fetch details for site ${site.name}:`, detailError);
                             return { ...site, content: null, error: 'Failed to load details' }; // Keep basic info
                        }
                     })
                );
                setSites(sitesWithDetails);
            } else {
                 setSites([]);
            }

        } catch (err) {
            console.error("Failed to fetch sites list:", err);
            setSites([]);
        } finally {
             setIsFetching(false);
        }
    }, [request, setError]);

    // Initial fetch
    useEffect(() => {
        fetchSites();
    }, [fetchSites]);

    // --- Action Handlers ---
     const handleEnableToggle = async (siteName, currentStatus) => {
         const newStatus = !currentStatus;
         setError(null);
         try {
             await request(`/nginx/sites/${siteName}`, {
                 method: 'PUT',
                 body: JSON.stringify({ enable: newStatus }),
             });
             fetchSites(); // Refresh list after toggle
         } catch (err) {
              console.error(`Failed to ${newStatus ? 'enable' : 'disable'} site ${siteName}:`, err);
         }
     };

    const handleOpenCreate = () => setIsCreateOpen(true);
    const handleOpenEdit = (site) => { setSelectedSite(site); setIsEditOpen(true); };
    const handleOpenView = (site) => { setSelectedSite(site); setIsViewOpen(true); };
    const handleOpenDelete = (siteName) => { setSelectedSite({ name: siteName }); setIsDeleteOpen(true); };

    const handleCloseDialogs = () => {
        setIsCreateOpen(false);
        setIsEditOpen(false);
        setIsViewOpen(false);
        setIsDeleteOpen(false);
        setSelectedSite(null);
    };

    // Placeholder callbacks for dialogs
    const handleSiteCreated = () => { fetchSites(); handleCloseDialogs(); };
    const handleSiteUpdated = () => { fetchSites(); handleCloseDialogs(); };
    const handleSiteDeleted = () => { fetchSites(); handleCloseDialogs(); };


    // --- Render Logic ---
    return (
        <TooltipProvider>
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Available Sites</h2>
                    <div>
                         <Button onClick={fetchSites} variant="outline" size="icon" className="mr-2" disabled={isFetching}>
                             <RefreshCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                         </Button>
                        <Button onClick={handleOpenCreate} disabled={isFetching}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Create New Site
                        </Button>
                    </div>
                </div>

                 {error && !isFetching && ( // Only show error if not currently fetching
                     <Alert variant="destructive" className="mb-4">
                       <AlertTitle>Error</AlertTitle>
                       <AlertDescription>
                         {error}
                       </AlertDescription>
                     </Alert>
                 )}

                <Table>
                    <TableCaption>A list of your Nginx sites. {isFetching ? 'Loading...' : ''}</TableCaption>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Site Name</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Enabled</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sites.length === 0 && !isFetching ? (
                             <TableRow>
                                 <TableCell colSpan={4} className="text-center">No sites found.</TableCell>
                             </TableRow>
                        ) : (
                            sites.map((site) => (
                                <TableRow key={site.name}>
                                    <TableCell className="font-medium">{site.name}</TableCell>
                                    <TableCell>
                                        <Badge variant={site.is_enabled ? "success" : "secondary"}>
                                            {site.is_enabled ? 'Enabled' : 'Disabled'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                         <Tooltip>
                                             <TooltipTrigger asChild>
                                                {/* Disable switch while fetching to prevent race conditions */}
                                                 <Switch
                                                     checked={site.is_enabled}
                                                     onCheckedChange={() => handleEnableToggle(site.name, site.is_enabled)}
                                                     aria-label={`Toggle ${site.name}`}
                                                     disabled={isFetching}
                                                 />
                                             </TooltipTrigger>
                                             <TooltipContent>
                                                 <p>{site.is_enabled ? 'Disable' : 'Enable'} site</p>
                                             </TooltipContent>
                                         </Tooltip>
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" onClick={() => handleOpenView(site)} disabled={!site.content && !site.error}>
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>View Config</p></TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                             <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(site)} disabled={!site.content && !site.error}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                             </TooltipTrigger>
                                             <TooltipContent><p>Edit Config</p></TooltipContent>
                                         </Tooltip>
                                         <Tooltip>
                                             <TooltipTrigger asChild>
                                                 <Button variant="destructive" size="icon" onClick={() => handleOpenDelete(site.name)}>
                                                     <Trash2 className="h-4 w-4" />
                                                 </Button>
                                             </TooltipTrigger>
                                             <TooltipContent><p>Delete Site</p></TooltipContent>
                                         </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                 {/* Placeholder Dialogs */}
                 <CreateSiteDialog isOpen={isCreateOpen} onClose={handleCloseDialogs} onSiteCreated={handleSiteCreated} />
                 <EditSiteDialog site={selectedSite} isOpen={isEditOpen} onClose={handleCloseDialogs} onSiteUpdated={handleSiteUpdated} />
                 <ViewSiteDialog site={selectedSite} isOpen={isViewOpen} onClose={handleCloseDialogs} />
                 <DeleteSiteConfirmDialog siteName={selectedSite?.name} isOpen={isDeleteOpen} onClose={handleCloseDialogs} onSiteDeleted={handleSiteDeleted} />

            </div>
        </TooltipProvider>
    );
};

export default SitesList;