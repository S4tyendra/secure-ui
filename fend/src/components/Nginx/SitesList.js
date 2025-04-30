import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router'; // Import useRouter
import useApi from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"; // Import Card components
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Trash2, PlusCircle, RefreshCcw, AlertTriangle } from 'lucide-react'; // Updated icons
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"; // Import AlertDialog components
import Link from 'next/link';

// --- Placeholder Dialog Component (Only Create is needed now) ---
const CreateSiteDialog = ({ isOpen, onClose, onSiteCreated }) => {
    if (!isOpen) return null;
    // Replace with your actual Shadcn Dialog implementation
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-background p-6 rounded shadow-lg border">
                <h3 className="text-lg font-semibold mb-4">Create New Nginx Site</h3>
                <p className="text-sm text-muted-foreground mb-4">
                    (Placeholder: Implement site creation form here)
                </p>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={() => { /* Call API to create site */ onSiteCreated(); }}>Create</Button>
                </div>
            </div>
        </div>
    );
};
// --- End Placeholder Dialog ---


const SitesList = () => {
    const { request, loading, error, setError } = useApi();
    const router = useRouter(); // Initialize router
    const [sites, setSites] = useState([]);
    const [isFetching, setIsFetching] = useState(false);
    const [isToggling, setIsToggling] = useState(null); // Track which site's toggle is loading
    const [isDeleting, setIsDeleting] = useState(null); // Track which site is being deleted


    // --- Dialog States ---
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    // Edit, View, and Delete dialog states are removed as they are handled differently now

    // Fetch sites data (simplified, only fetches list, not details)
    const fetchSites = useCallback(async () => {
        setIsFetching(true);
        setError(null);
        try {
            // Only fetch the list of sites
            const siteListData = await request('/nginx/sites');
            if (siteListData && Array.isArray(siteListData)) {
                setSites(siteListData); // Assumes API returns { name: string, is_enabled: boolean }
            } else {
                setSites([]);
            }
        } catch (err) {
            console.error("Failed to fetch sites list:", err);
            setError(err.message || 'Failed to load sites.');
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
    const handleEnableToggle = async (siteName, currentStatus, e) => {
        e.stopPropagation(); // Prevent card click navigation
        const newStatus = !currentStatus;
        setError(null);
        setIsToggling(siteName); // Set loading state for this specific toggle
        try {
            await request(`/nginx/sites/${siteName}`, {
                method: 'PUT',
                body: JSON.stringify({ enable: newStatus }),
            });
            // Update local state immediately for better UX
            setSites(prevSites =>
                prevSites.map(site =>
                    site.name === siteName ? { ...site, is_enabled: newStatus } : site
                )
            );
            // Optionally refetch to confirm, but local update is faster
            // fetchSites();
        } catch (err) {
            console.error(`Failed to ${newStatus ? 'enable' : 'disable'} site ${siteName}:`, err);
            setError(`Failed to ${newStatus ? 'enable' : 'disable'} ${siteName}.`);
            // Revert local state on error
            setSites(prevSites =>
                 prevSites.map(site =>
                     site.name === siteName ? { ...site, is_enabled: currentStatus } : site
                 )
            );
        } finally {
            setIsToggling(null); // Clear loading state
        }
    };

    const handleDeleteSite = async (siteName) => {
        setError(null);
        setIsDeleting(siteName);
        try {
            await request(`/nginx/sites/${siteName}`, {
                method: 'DELETE',
            });
            // Remove site from local state
            setSites(prevSites => prevSites.filter(site => site.name !== siteName));
        } catch (err) {
            console.error(`Failed to delete site ${siteName}:`, err);
            setError(`Failed to delete site ${siteName}.`);
        } finally {
             setIsDeleting(null);
        }
    };


    const handleOpenCreate = () => setIsCreateOpen(true);
    const handleCloseDialogs = () => setIsCreateOpen(false);
    const handleSiteCreated = () => { fetchSites(); handleCloseDialogs(); };

    // Navigate to site detail page
    const handleCardClick = (siteName) => {
        router.push(`/dashboard/nginx/sites/${siteName}`);
    };


    // --- Render Logic ---
    return (
        <TooltipProvider>
            <div>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold tracking-tight">Nginx Sites</h2>
                    <div className="flex items-center gap-2">
                         <Tooltip>
                             <TooltipTrigger asChild>
                                 <Button onClick={fetchSites} variant="outline" size="icon" disabled={isFetching || !!isToggling || !!isDeleting}>
                                     <RefreshCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                                 </Button>
                             </TooltipTrigger>
                              <TooltipContent><p>Refresh List</p></TooltipContent>
                         </Tooltip>
                        <Button onClick={handleOpenCreate} disabled={isFetching || !!isToggling || !!isDeleting}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Create Site
                        </Button>
                    </div>
                </div>

                 {error && !isFetching && (
                     <Alert variant="destructive" className="mb-4">
                       <AlertTriangle className="h-4 w-4" />
                       <AlertTitle>Error</AlertTitle>
                       <AlertDescription>
                         {error}
                       </AlertDescription>
                     </Alert>
                 )}

                 {isFetching && sites.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">Loading sites...</div>
                 )}

                 {!isFetching && sites.length === 0 && !error && (
                      <div className="text-center text-muted-foreground py-8 border border-dashed rounded-lg">
                          No Nginx sites found. Click &quot;Create Site&quot; to add one.
                      </div>
                 )}

                {/* Grid Layout for Site Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sites.map((site) => (
                        <Card
                            key={site.name}
                            className="hover:shadow-md transition-shadow duration-200 cursor-pointer group"
                            asChild
                        >
                            <Link
                                href={`/dashboard/nginx/sites/${site.name}`}
                            >
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-base font-medium truncate group-hover:text-primary">
                                    {site.name}
                                </CardTitle>
                                <Badge variant={site.is_enabled ? "default" : "outline"} className="text-xs">
                                    {site.is_enabled ? 'Enabled' : 'Disabled'}
                                </Badge>
                            </CardHeader>
                            </Link>
                            <CardContent className="flex items-center justify-between pt-2">
                                <div className="flex items-center space-x-2">
                                     <Tooltip>
                                         <TooltipTrigger asChild>
                                            
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <Switch
                                                    checked={site.is_enabled}
                                                    onCheckedChange={(checked) => handleEnableToggle(site.name, !checked, event)}
                                                    aria-label={`Toggle ${site.name}`}
                                                    disabled={isToggling === site.name || isFetching || !!isDeleting}
                                                    className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-secondary"
                                                />
                                            </div>
                                         </TooltipTrigger>
                                         <TooltipContent>
                                             <p>{site.is_enabled ? 'Click to Disable' : 'Click to Enable'}</p>
                                         </TooltipContent>
                                     </Tooltip>
                                     <span className="text-xs text-muted-foreground">
                                        { isToggling === site.name ? 'Updating...' : (site.is_enabled ? 'Enabled' : 'Disabled') }
                                     </span>
                                </div>

                                {/* Delete Button with Confirmation */}
                                <AlertDialog>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            {/* Wrap Button in a div to stop propagation */}
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        variant="destructive"
                                                        size="icon"
                                                        className=" hover:text-destructive h-7 w-7"
                                                        disabled={isDeleting === site.name || isFetching || !!isToggling}
                                                    >
                                                        <Trash2 className={`h-4 w-4 ${isDeleting === site.name ? 'animate-pulse' : ''}`} />
                                                    </Button>
                                                </AlertDialogTrigger>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Delete Site</p></TooltipContent>
                                    </Tooltip>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete the
                                                <strong className="mx-1">{site.name}</strong> site configuration file.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel disabled={isDeleting === site.name}>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() => handleDeleteSite(site.name)}
                                                disabled={isDeleting === site.name}
                                                variant="destructive"
                                            >
                                                {isDeleting === site.name ? 'Deleting...' : 'Yes, delete it'}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                 {/* Placeholder Create Dialog */}
                 <CreateSiteDialog isOpen={isCreateOpen} onClose={handleCloseDialogs} onSiteCreated={handleSiteCreated} />

            </div>
        </TooltipProvider>
    );
};

export default SitesList;