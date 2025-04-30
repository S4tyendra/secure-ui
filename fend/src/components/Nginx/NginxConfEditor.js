import React, { useState, useEffect, useCallback } from 'react';
import useApi from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RefreshCcw, Save, Ban } from 'lucide-react'; // Icons
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const NginxConfEditor = () => {
    const { request, loading: apiLoading, error, setError } = useApi();
    const [content, setContent] = useState('');
    const [originalContent, setOriginalContent] = useState(''); // To track changes
    const [isFetching, setIsFetching] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false); // To show success message

    const hasChanges = content !== originalContent;

    // Fetch config content
    const fetchConfig = useCallback(async () => {
        setIsFetching(true);
        setError(null);
        setSaveSuccess(false); // Clear success message on refresh
        try {
            const data = await request('/nginx/conf');
            const fetchedContent = data?.content || '';
            setContent(fetchedContent);
            setOriginalContent(fetchedContent);
        } catch (err) {
            console.error("Failed to fetch nginx.conf:", err);
            setContent(''); // Clear content on error
            setOriginalContent('');
        } finally {
            setIsFetching(false);
        }
    }, [request, setError]);

    // Initial fetch
    useEffect(() => {
        fetchConfig();
    }, [fetchConfig]);

    // Handle Save
    const handleSave = async () => {
        setIsSaving(true);
        setError(null);
        setSaveSuccess(false);
        try {
            await request('/nginx/conf', {
                method: 'PUT',
                body: JSON.stringify({ content: content }),
            });
            setOriginalContent(content); // Update original content on successful save
            setSaveSuccess(true); // Show success message
            // Optionally auto-hide success message after a delay
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            console.error("Failed to save nginx.conf:", err);
            // Error is set by useApi hook
        } finally {
            setIsSaving(false);
        }
    };

    // Handle Discard Changes
    const handleDiscard = () => {
        setContent(originalContent);
        setError(null); // Clear any previous errors
        setSaveSuccess(false);
    };

    const isLoading = isFetching || isSaving;

    return (
        <TooltipProvider>
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">nginx.conf Content</h2>
                    <div className="flex items-center space-x-2">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button onClick={handleDiscard} variant="outline" size="icon" disabled={!hasChanges || isLoading}>
                                    <Ban className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Discard Changes</p></TooltipContent>
                        </Tooltip>
                         <Tooltip>
                            <TooltipTrigger asChild>
                                <Button onClick={handleSave} variant="default" size="icon" disabled={!hasChanges || isLoading}>
                                    <Save className={`h-4 w-4 ${isSaving ? 'animate-pulse' : ''}`} />
                                </Button>
                             </TooltipTrigger>
                            <TooltipContent><p>Save Changes</p></TooltipContent>
                         </Tooltip>
                         <Tooltip>
                             <TooltipTrigger asChild>
                                 <Button onClick={fetchConfig} variant="outline" size="icon" disabled={isLoading}>
                                     <RefreshCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                                 </Button>
                             </TooltipTrigger>
                             <TooltipContent><p>Reload Config from Server</p></TooltipContent>
                         </Tooltip>
                    </div>
                </div>

                {saveSuccess && (
                     <Alert variant="success" className="mb-4">
                       <AlertTitle>Success</AlertTitle>
                       <AlertDescription>Nginx configuration saved successfully.</AlertDescription>
                     </Alert>
                 )}
                 {error && (
                     <Alert variant="destructive" className="mb-4">
                       <AlertTitle>Error</AlertTitle>
                       <AlertDescription>{error}</AlertDescription>
                     </Alert>
                 )}

                <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={isFetching ? "Loading configuration..." : "Nginx configuration content"}
                    className="font-mono text-sm min-h-[400px] h-[60vh]" // Adjust height as needed
                    disabled={isLoading}
                />
                 <p className="text-xs  mt-2">
                    Note: Saving changes here updates the main nginx.conf file. Use with caution. A backup (.bak) should be created by the server.
                 </p>
            </div>
        </TooltipProvider>
    );
};

export default NginxConfEditor;