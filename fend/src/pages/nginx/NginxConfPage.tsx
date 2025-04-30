import React, { useState, useEffect, useCallback } from 'react';
import useApi from '@/hooks/useApi';
import axios from 'axios'; // Import axios for type checking
import { NginxConf, ConfActionStatus, NginxCommandStatus, ApiErrorData } from '@/types/api'; // Import ApiErrorData
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label"; // Import Label
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, CheckCircle, XCircle, Info, Loader2, Save, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from 'sonner';
import { cn } from "@/lib/utils"; // For conditional classes

const NginxConfPage = () => {
    const api = useApi();
    const [confContent, setConfContent] = useState<string>('');
    const [initialContent, setInitialContent] = useState<string>(''); // To check for changes
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [isReloading, setIsReloading] = useState(false);
    const [lastCommandResult, setLastCommandResult] = useState<NginxCommandStatus | null>(null);

    const fetchConfig = useCallback(async () => {
        setIsLoading(true);
        setLastCommandResult(null); // Clear previous command results on fetch
        try {
            const response = await api.get<NginxConf>('/nginx/conf');
            setConfContent(response.data.content);
            setInitialContent(response.data.content); // Store initial state
        } catch (error) {
            console.error("Failed to fetch nginx config:", error);
            setConfContent("Error loading configuration.");
            setInitialContent("Error loading configuration.");
        } finally {
            setIsLoading(false);
        }
    }, [api]);

    useEffect(() => {
        fetchConfig();
    }, [fetchConfig]);

    const hasChanges = confContent !== initialContent;

    const handleSaveConfig = async () => {
        setIsSaving(true);
        setLastCommandResult(null);
        const toastId = toast.loading("Saving Nginx configuration...");
        try {
            const payload: NginxConf = { content: confContent };
            await api.put<ConfActionStatus>('/nginx/conf', payload);
            setInitialContent(confContent); // Update initial state on successful save
            toast.success("Nginx configuration saved successfully. Consider testing and reloading.", { id: toastId });
        } catch (error) {
            toast.error("Failed to save Nginx configuration.", { id: toastId });
            console.error("Save config error:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleTestConfig = async () => {
        setIsTesting(true);
        setLastCommandResult(null);
        const toastId = toast.loading("Testing Nginx configuration...");
        try {
            const response = await api.post<NginxCommandStatus>('/nginx/actions/test');
            setLastCommandResult(response.data);
            if (response.data.success) {
                toast.success("Nginx configuration test successful.", { id: toastId });
            } else {
                toast.error(`Nginx configuration test failed (Code: ${response.data.return_code}). Check details below.`, { id: toastId });
            }
        } catch (error) { // Remove 'any'
            // Handle case where the request itself fails (not just command failure)
            let apiErrorMessage = "Failed to run config test command.";
            if (axios.isAxiosError(error) && error.response?.data) {
                const errorData = error.response.data as ApiErrorData;
                if (typeof errorData.detail === 'string') apiErrorMessage = errorData.detail;
                else if (typeof errorData.message === 'string') apiErrorMessage = errorData.message;
            } else if (error instanceof Error) {
                apiErrorMessage = error.message;
            }
            toast.error(apiErrorMessage , { id: toastId });
            console.error("Test config error:", error);
            setLastCommandResult({
                 success: false, command: 'sudo nginx -t', return_code: -1, message: `API Error: ${apiErrorMessage}`, stdout: null, stderr: null
            });
        } finally {
            setIsTesting(false);
        }
    };

     const handleReloadNginx = async () => {
         setIsReloading(true);
         setLastCommandResult(null);
         const toastId = toast.loading("Reloading Nginx service...");
         try {
             const response = await api.post<NginxCommandStatus>('/nginx/actions/reload');
             setLastCommandResult(response.data);
             if (response.data.success) {
                 toast.success("Nginx reload command sent successfully.", { id: toastId });
             } else {
                  toast.error(`Nginx reload command failed (Code: ${response.data.return_code}). Check details below.`, { id: toastId });
              }
          } catch (error) { // Remove 'any'
             let apiErrorMessage = "Failed to run reload command.";
             if (axios.isAxiosError(error) && error.response?.data) {
                 const errorData = error.response.data as ApiErrorData;
                 if (typeof errorData.detail === 'string') apiErrorMessage = errorData.detail;
                 else if (typeof errorData.message === 'string') apiErrorMessage = errorData.message;
             } else if (error instanceof Error) {
                  apiErrorMessage = error.message;
             }
             toast.error(apiErrorMessage, { id: toastId });
             console.error("Reload nginx error:", error);
             setLastCommandResult({
                  success: false, command: 'sudo systemctl reload nginx', return_code: -1, message: `API Error: ${apiErrorMessage}`, stdout: null, stderr: null
             });
         } finally {
             setIsReloading(false);
         }
     };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-semibold">Nginx Configuration (nginx.conf)</h1>

             <Card>
                <CardHeader>
                     <CardTitle>Edit Configuration</CardTitle>
                     <CardDescription>
                         Modify the main Nginx configuration file. Changes require saving, testing, and reloading Nginx to take effect. Use with caution.
                     </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <Textarea
                         value={isLoading ? "Loading configuration..." : confContent}
                         onChange={(e) => setConfContent(e.target.value)}
                         className="min-h-[400px] font-mono text-sm border rounded-md p-4"
                         disabled={isLoading || isSaving}
                         aria-label="Nginx configuration content"
                     />
                     {hasChanges && (
                         <Alert variant="default" className="bg-yellow-50 border-yellow-200 dark:bg-yellow-900/30 dark:border-yellow-700">
                              <Info className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                              <AlertTitle className="text-yellow-700 dark:text-yellow-300">Unsaved Changes</AlertTitle>
                              <AlertDescription className="text-yellow-600 dark:text-yellow-400">
                                   You have unsaved changes. Remember to save, test, and reload.
                              </AlertDescription>
                         </Alert>
                     )}
                 </CardContent>
                 <CardFooter className="flex justify-between items-center gap-4 flex-wrap">
                      <Button onClick={handleSaveConfig} disabled={isLoading || isSaving || !hasChanges}>
                          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                          Save Changes
                      </Button>
                      <div className="flex gap-2 flex-wrap">
                           <Button variant="outline" onClick={handleTestConfig} disabled={isLoading || isSaving || isTesting || isReloading}>
                                {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                                Test Config
                           </Button>
                           <Button variant="outline" onClick={handleReloadNginx} disabled={isLoading || isSaving || isTesting || isReloading}>
                                {isReloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                                Reload Nginx
                           </Button>
                       </div>
                 </CardFooter>
            </Card>

            {lastCommandResult && (
                 <Card>
                      <CardHeader>
                           <CardTitle className="flex items-center gap-2">
                                <Terminal className="h-5 w-5" /> Command Result
                                {lastCommandResult.success ? (
                                     <CheckCircle className="h-5 w-5 text-green-600" />
                                ) : (
                                     <XCircle className="h-5 w-5 text-red-600" />
                                )}
                           </CardTitle>
                           <CardDescription>
                                Output from the last executed command: <code>{lastCommandResult.command}</code> (Exit Code: {lastCommandResult.return_code})
                           </CardDescription>
                      </CardHeader>
                      <CardContent>
                            <Alert variant={lastCommandResult.success ? "default" : "destructive"} className={cn(!lastCommandResult.success && "bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-700")}>
                                 <AlertTitle className={cn(!lastCommandResult.success && "text-red-800 dark:text-red-300")}>
                                      Status: {lastCommandResult.success ? "Success" : "Failed"}
                                 </AlertTitle>
                                 <AlertDescription className={cn("text-sm", !lastCommandResult.success && "text-red-700 dark:text-red-300")}>
                                     {lastCommandResult.message}
                                 </AlertDescription>
                             </Alert>

                           {lastCommandResult.stdout && (
                                <div className="mt-4">
                                     <Label className="font-semibold">Standard Output:</Label>
                                     <pre className="mt-1 text-xs whitespace-pre-wrap break-words bg-muted/50 rounded-md p-3 max-h-40 overflow-auto">
                                          {lastCommandResult.stdout}
                                     </pre>
                                </div>
                           )}
                           {lastCommandResult.stderr && (
                                <div className="mt-4">
                                     <Label className="font-semibold text-red-600 dark:text-red-400">Standard Error:</Label>
                                     <pre className="mt-1 text-xs whitespace-pre-wrap break-words bg-destructive/10 text-destructive dark:bg-red-900/30 dark:text-red-300 rounded-md p-3 max-h-40 overflow-auto">
                                          {lastCommandResult.stderr}
                                     </pre>
                                </div>
                           )}
                      </CardContent>
                 </Card>
            )}

        </div>
    );
};

export default NginxConfPage;