import React, { useState, useEffect, useMemo, useCallback } from 'react';
import useApi from '@/hooks/useApi';
import { SiteInfo, SiteCreate, SiteUpdate, SiteActionStatus } from '@/types/api';
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, PlusCircle, Edit, Trash2, Loader2 } from "lucide-react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription, DialogClose
} from "@/components/ui/dialog";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';

// Define state structure for editing
interface EditingSiteState extends SiteInfo {
     isLoadingContent?: boolean;
}

const NginxSitesPage = () => {
    const api = useApi();
    const [sites, setSites] = useState<SiteInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false); // For form submissions
    const [sorting, setSorting] = useState<SortingState>([]);

    // Dialog States
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingSite, setEditingSite] = useState<EditingSiteState | null>(null);
    const [newSiteData, setNewSiteData] = useState<SiteCreate>({ name: '', content: '' });

    const fetchSites = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await api.get<SiteInfo[]>('/nginx/sites');
            setSites(response.data);
        } catch (error) {
            console.error("Failed to fetch sites:", error);
            setSites([]);
        } finally {
            setIsLoading(false);
        }
    }, [api]);

    useEffect(() => {
        fetchSites();
    }, [fetchSites]);

    // --- Action Handlers ---

    const handleToggleEnable = async (siteName: string, enable: boolean) => {
        const originalSites = [...sites];
        // Optimistically update UI
        setSites(currentSites => currentSites.map(s => s.name === siteName ? { ...s, is_enabled: enable } : s));
        const toastId = toast.loading(`${enable ? 'Enabling' : 'Disabling'} site ${siteName}...`);

        try {
            const payload: SiteUpdate = { enable };
            await api.put<SiteActionStatus>(`/nginx/sites/${siteName}`, payload);
            toast.success(`Site ${siteName} ${enable ? 'enabled' : 'disabled'} successfully.`, { id: toastId });
            // Optionally refetch or just confirm optimistic update
            fetchSites(); // Refetch to ensure consistency
        } catch (error) {
            toast.error(`Failed to ${enable ? 'enable' : 'disable'} site ${siteName}. Restoring state.`, { id: toastId });
            console.error("Toggle enable error:", error);
            setSites(originalSites); // Revert optimistic update
        }
    };

    const handleDeleteSite = async (siteName: string) => {
        const toastId = toast.loading(`Deleting site ${siteName}...`);
        try {
            await api.delete<SiteActionStatus>(`/nginx/sites/${siteName}`);
            toast.success(`Site ${siteName} deleted successfully.`, { id: toastId });
            fetchSites(); // Refresh list
        } catch (error) {
            toast.error(`Failed to delete site ${siteName}.`, { id: toastId });
            console.error("Delete site error:", error);
        }
    };

    const handleCreateSite = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!newSiteData.name || !newSiteData.content) {
            toast.error("Site name and content cannot be empty.");
            return;
        }
        setIsSubmitting(true);
        const toastId = toast.loading(`Creating site ${newSiteData.name}...`);
        try {
            await api.post<SiteActionStatus>('/nginx/sites', newSiteData);
            toast.success(`Site ${newSiteData.name} created successfully.`, { id: toastId });
            setIsCreateDialogOpen(false);
            setNewSiteData({ name: '', content: '' }); // Reset form
            fetchSites(); // Refresh list
        } catch (error) {
            toast.error(`Failed to create site ${newSiteData.name}.`, { id: toastId });
            console.error("Create site error:", error);
        } finally {
             setIsSubmitting(false);
        }
    };

    const handleEditSite = async (event: React.FormEvent<HTMLFormElement>) => {
         event.preventDefault();
         if (!editingSite || !editingSite.content) {
              toast.error("Site content cannot be empty.");
              return;
         }
         setIsSubmitting(true);
         const toastId = toast.loading(`Updating site ${editingSite.name}...`);
         try {
             const payload: SiteUpdate = { content: editingSite.content };
              await api.put<SiteActionStatus>(`/nginx/sites/${editingSite.name}`, payload);
              toast.success(`Site ${editingSite.name} updated successfully.`, { id: toastId });
              setIsEditDialogOpen(false);
              setEditingSite(null); // Clear editing state
              fetchSites(); // Refresh list
         } catch (error) {
              toast.error(`Failed to update site ${editingSite.name}.`, { id: toastId });
              console.error("Update site error:", error);
         } finally {
             setIsSubmitting(false);
         }
    };

    // Function to open edit dialog and fetch full content
    const openEditDialog = async (site: SiteInfo) => {
         setEditingSite({ ...site, content: site.content ?? '', isLoadingContent: true }); // Set initial state with loading
         setIsEditDialogOpen(true);
         try {
            const response = await api.get<SiteInfo>(`/nginx/sites/${site.name}`);
             setEditingSite({ ...response.data, content: response.data.content ?? '', isLoadingContent: false }); // Update with full content
         } catch (error) {
             toast.error(`Failed to load content for site ${site.name}.`);
             console.error("Fetch site content error:", error);
             setEditingSite({ ...site, content: 'Error loading content.', isLoadingContent: false }); // Show error in textarea
         }
    };


    // --- Table Columns ---
    const columns: ColumnDef<SiteInfo>[] = useMemo(() => [
        {
            accessorKey: "name",
            header: ({ column }) => (
                 <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    Site Name <ArrowUpDown className="ml-2 h-4 w-4" />
                 </Button>
            ),
             cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>,
             enableSorting: true,
        },
        {
            accessorKey: "is_enabled",
             header: ({ column }) => (
                 <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    Status <ArrowUpDown className="ml-2 h-4 w-4" />
                 </Button>
            ),
            cell: ({ row }) => {
                const isEnabled = row.getValue("is_enabled") as boolean;
                const siteName = row.original.name;
                return (
                     <div className='flex items-center space-x-2'>
                         <Switch
                             id={`enable-${siteName}`}
                             checked={isEnabled}
                             onCheckedChange={(checked) => handleToggleEnable(siteName, checked)}
                             aria-label={isEnabled ? "Disable site" : "Enable site"}
                         />
                          <Badge variant={isEnabled ? "default" : "outline"} className={isEnabled ? 'bg-green-600 hover:bg-green-700' : ''}>
                             {isEnabled ? "Enabled" : "Disabled"}
                         </Badge>
                     </div>
                );
            },
            enableSorting: true,
        },
        {
            id: "actions",
            header: () => <div className="text-right">Actions</div>,
            cell: ({ row }) => {
                 const site = row.original;
                 return (
                    <div className="text-right space-x-2">
                         <Button variant="outline" size="sm" onClick={() => openEditDialog(site)}>
                              <Edit className="mr-1 h-4 w-4" /> Edit
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
                                         This action cannot be undone. This will permanently delete the site configuration file for <span className='font-semibold'>{site.name}</span>.
                                         It will also disable the site if it's currently enabled.
                                     </AlertDialogDescription>
                                 </AlertDialogHeader>
                                 <AlertDialogFooter>
                                     <AlertDialogCancel>Cancel</AlertDialogCancel>
                                     <AlertDialogAction onClick={() => handleDeleteSite(site.name)} className='bg-destructive hover:bg-destructive/90'>
                                          Delete Site
                                     </AlertDialogAction>
                                 </AlertDialogFooter>
                             </AlertDialogContent>
                         </AlertDialog>
                    </div>
                 );
            },
        },
    ], [api]); // Add dependencies later if needed, like handleToggleEnable etc.


    const table = useReactTable({
        data: sites,
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
                 <h1 className="text-2xl font-semibold">Nginx Sites</h1>
                 <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                     <DialogTrigger asChild>
                          <Button>
                              <PlusCircle className="mr-2 h-4 w-4" /> Create Site
                          </Button>
                     </DialogTrigger>
                     <DialogContent className="sm:max-w-[600px]"> {/* Wider dialog */}
                          <DialogHeader>
                              <DialogTitle>Create New Nginx Site</DialogTitle>
                              <DialogDescription>
                                   Define the configuration for a new site in sites-available. It will be disabled by default.
                              </DialogDescription>
                          </DialogHeader>
                          <form onSubmit={handleCreateSite}>
                              <div className="grid gap-4 py-4">
                                   <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="create-site-name" className="text-right">Name</Label>
                                        <Input
                                             id="create-site-name"
                                             value={newSiteData.name}
                                             onChange={(e) => setNewSiteData({ ...newSiteData, name: e.target.value.replace(/[^a-zA-Z0-9._-]/g, '') })} // Basic sanitization
                                             className="col-span-3"
                                             placeholder="example.com or my-app"
                                             required
                                             disabled={isSubmitting}
                                        />
                                   </div>
                                   <div className="grid grid-cols-4 items-start gap-4">
                                        <Label htmlFor="create-site-content" className="text-right pt-2">Content</Label>
                                        <Textarea
                                             id="create-site-content"
                                             value={newSiteData.content}
                                             onChange={(e) => setNewSiteData({ ...newSiteData, content: e.target.value })}
                                             className="col-span-3 min-h-[200px] font-mono text-sm" // Fixed height and mono font
                                             placeholder={`server {\n    listen 80;\n    server_name ${newSiteData.name || 'example.com'};\n\n    location / {\n        root /var/www/${newSiteData.name || 'html'};\n        index index.html index.htm;\n    }\n}`}
                                             required
                                             disabled={isSubmitting}
                                        />
                                   </div>
                              </div>
                              <DialogFooter>
                                    <DialogClose asChild>
                                         <Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button>
                                     </DialogClose>
                                   <Button type="submit" disabled={isSubmitting}>
                                       {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                       Create Site
                                   </Button>
                              </DialogFooter>
                          </form>
                     </DialogContent>
                 </Dialog>
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
                             <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">Loading sites...</TableCell></TableRow>
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
                            <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No sites found.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

             {/* Edit Dialog */}
             <Dialog open={isEditDialogOpen} onOpenChange={(open) => { if (!open) setEditingSite(null); setIsEditDialogOpen(open); }}>
                 <DialogContent className="sm:max-w-[600px]">
                      <DialogHeader>
                           <DialogTitle>Edit Site: {editingSite?.name}</DialogTitle>
                           <DialogDescription>Modify the configuration content for this site.</DialogDescription>
                      </DialogHeader>
                       {editingSite && (
                            <form onSubmit={handleEditSite}>
                                <div className="grid gap-4 py-4">
                                     <div className="grid grid-cols-1 items-start gap-4">
                                          <Label htmlFor="edit-site-content" className="sr-only">Content</Label>
                                          <Textarea
                                               id="edit-site-content"
                                               // Remove duplicate ID attribute below
                                               value={editingSite.isLoadingContent ? "Loading content..." : (editingSite.content ?? '')}
                                               onChange={(e) => setEditingSite({ ...editingSite, content: e.target.value })}
                                               className="col-span-3 min-h-[300px] font-mono text-sm"
                                               disabled={isSubmitting || editingSite.isLoadingContent}
                                          />
                                     </div>
                                </div>
                                <DialogFooter>
                                     <DialogClose asChild>
                                          <Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button>
                                     </DialogClose>
                                     <Button type="submit" disabled={isSubmitting || editingSite.isLoadingContent}>
                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                          Save Changes
                                     </Button>
                                </DialogFooter>
                           </form>
                       )}
                 </DialogContent>
             </Dialog>
        </div>
    );
};

export default NginxSitesPage;