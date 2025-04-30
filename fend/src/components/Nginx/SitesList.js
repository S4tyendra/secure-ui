import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router'; // Import useRouter
import useApi from '@/hooks/useApi';
import { Button, buttonVariants } from '@/components/ui/button'; // Import buttonVariants
import { Input } from "@/components/ui/input"; // Import Input
import { Label } from "@/components/ui/label"; // Import Label
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
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose
} from "@/components/ui/dialog"; // Import Dialog components
// No Textarea needed as per latest instruction
import { Loader2 } from 'lucide-react'; // For loading spinner
import Link from 'next/link';

// --- Create Site Dialog ---
const CreateSiteDialog = ({ isOpen, onClose, onSubmit, isCreating, createError }) => {
    const [siteName, setSiteName] = useState('');

    useEffect(() => {
        // Reset name when dialog is closed externally
        if (!isOpen) {
            setSiteName('');
        }
    }, [isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (siteName.trim() && !isCreating) {
            onSubmit(siteName.trim());
            // Don't close here, parent will close on success
        }
    };

    // Use onOpenChange to trigger onClose when user clicks outside or hits Esc
    const handleOpenChange = (open) => {
        if (!open && !isCreating) { // Prevent closing while submitting
            onClose();
        }
        // Note: We don't control the `open` state directly here anymore,
        // it's managed by the parent via the `isOpen` prop.
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            {/* The Trigger is now managed by the parent SitesList */}
            {/* <DialogTrigger asChild>...</DialogTrigger> */}
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Create New Nginx Site</DialogTitle>
                        <DialogDescription>
                            Enter a name for the new site. A basic configuration file will be created.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="site-name" className="text-right">
                                Site Name
                            </Label>
                            <Input
                                id="site-name"
                                value={siteName}
                                onChange={(e) => setSiteName(e.target.value)}
                                className="col-span-3"
                                placeholder="e.g., my-cool-site.com"
                                required
                                disabled={isCreating}
                                pattern="^[a-zA-Z0-9.-]+$" // Basic validation
                                title="Site name can only contain letters, numbers, dots, and hyphens."
                            />
                        </div>
                    </div>
                    {createError && (
                        <Alert variant="destructive" className="mb-4">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Creation Failed</AlertTitle>
                          <AlertDescription>
                            {typeof createError === 'string' ? createError : 'An unexpected error occurred.'}
                          </AlertDescription>
                        </Alert>
                    )}
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isCreating}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!siteName.trim() || isCreating}>
                            {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {isCreating ? 'Creating...' : 'Create Site'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    ); // Close return statement
}; // Close CreateSiteDialog component
// --- End Create Site Dialog ---


const SitesList = () => {
    const { request, loading, error, setError } = useApi();
    const router = useRouter(); // Initialize router
    const [sites, setSites] = useState([]);
    const [isFetching, setIsFetching] = useState(false);
    const [isToggling, setIsToggling] = useState(null); // Track which site's toggle is loading
    const [isDeleting, setIsDeleting] = useState(null); // Track which site is being deleted

    // State for Create Dialog
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState(null);

    // Fetch sites data
    const fetchSites = useCallback(async () => {
        try { // Add missing try block
            setIsFetching(true);
            setError(null);
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
    const handleEnableToggle = async (siteName, currentStatus) => { // Remove 'e' parameter
        // e.stopPropagation(); // Removed - propagation stopped by wrapper div onClick
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


    // Handle Site Creation
    const handleCreateSite = async (siteName) => {
        setIsCreating(true);
        setCreateError(null);
        const defaultContent = `# /etc/nginx/sites-available/${siteName}\n\nserver {\n\tlisten 80;\n\tserver_name ${siteName};\n\n\tlocation / {\n\t\t# Example: proxy to a backend service\n\t\t# proxy_pass http://localhost:3000;\n\t\t# Example: serve static files\n\t\t# root /var/www/${siteName};\n\t\t# index index.html index.htm;\n\t}\n}`;

        try {
            const result = await request('/nginx/sites', {
                method: 'POST',
                body: JSON.stringify({ name: siteName, content: defaultContent }),
            });

            if (result && result.success && result.site_name) {
                setIsCreateOpen(false); // Close dialog on success
                await fetchSites(); // Refresh the list
                router.push(`/dashboard/nginx/sites/${encodeURIComponent(result.site_name)}`); // Navigate to new site
            } else {
                // Handle cases where API returns success: false or unexpected structure
                setCreateError(result?.message || 'Failed to create site. Please check the name and try again.');
            }
        } catch (err) {
            console.error("Failed to create site:", err);
            setCreateError(err.message || 'An unexpected error occurred during site creation.');
        } finally {
            setIsCreating(false);
        }
    };

    // Navigate to site detail page (for existing sites)
    const handleCardClick = (siteName) => {
        // Ensure we don't trigger this during toggle/delete actions within the card
        if (isToggling || isDeleting) return;
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
                        {/* Button to open the Create Dialog */}
                        <Button onClick={() => { setIsCreateOpen(true); setCreateError(null); }} disabled={isFetching || !!isToggling || !!isDeleting}>
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
                                                    onCheckedChange={(checked) => handleEnableToggle(site.name, site.is_enabled)} // Pass current status directly, remove event
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

                 {/* Create Site Dialog Component */}
                 <CreateSiteDialog
                     isOpen={isCreateOpen}
                     onClose={() => setIsCreateOpen(false)}
                     onSubmit={handleCreateSite}
                     isCreating={isCreating}
                     createError={createError}
                 />

            </div>
        </TooltipProvider>
    ); // Close return statement
}; // Close SitesList component
export default SitesList;