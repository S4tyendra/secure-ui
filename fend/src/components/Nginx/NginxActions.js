import React, { useState } from 'react';
import useApi from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Terminal, Power, CheckCircle, XCircle, HelpCircle, Zap, RefreshCw, Activity, AlertCircle } from 'lucide-react';

// Component to display the result of an action
const ActionResultDisplay = ({ title, result, loading, error }) => {
    if (loading) {
        return (
            <Card className="mt-4">
                <CardContent className="pt-4">
                    <div className="flex items-center mb-3">
                        <Skeleton className="h-5 w-5 mr-2 rounded-full" />
                        <Skeleton className="h-5 w-32" />
                    </div>
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2 mb-4" />
                    <Skeleton className="h-20 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="font-medium">Error Running {title}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }

    if (!result) {
        return null; // No result to display yet
    }

    const isSuccess = result.success;
    // Special handling for 'status' command which might return code 3 for inactive but still be 'successful' command execution
    const isStatusCommandPossiblyInactive = title === 'Nginx Status' && result.return_code === 3;

    return (
        <Card className={`mt-4 border-${isSuccess ? 'primary/20' : 'destructive/20'}`}>
            <CardHeader className="pb-2">
                <div className="flex items-center">
                    {isSuccess ? 
                        <CheckCircle className="h-5 w-5 mr-2 text-primary" /> : 
                        <XCircle className="h-5 w-5 mr-2 text-destructive" />
                    }
                    <CardTitle>{title} Result: {isSuccess ? 'Success' : 'Failed'}</CardTitle>
                    {isStatusCommandPossiblyInactive && 
                        <span className="ml-2 text-xs text-muted-foreground">(Service likely inactive - exit code 3)</span>
                    }
                </div>
                <CardDescription>
                    <span>Command: <code className="bg-muted text-muted-foreground px-1 rounded">{result.command}</code></span>
                    <span className="ml-2">Return Code: {result.return_code}</span>
                    {result.message && <p className="text-sm text-muted-foreground mt-1 italic">{result.message}</p>}
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
                {result.stdout && (
                    <div className="mb-3">
                        <h4 className="text-sm font-medium mb-1 text-foreground">stdout:</h4>
                        <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-40 w-full text-foreground">{result.stdout}</pre>
                    </div>
                )}
                {result.stderr && (
                    <div>
                        <h4 className="text-sm font-medium mb-1 text-foreground">stderr:</h4>
                        <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-40 w-full text-foreground">{result.stderr}</pre>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};


const NginxActions = () => {
    const { request, loading: apiLoading, error: apiError, setError } = useApi();
    const [testResult, setTestResult] = useState(null);
    const [reloadResult, setReloadResult] = useState(null);
    const [statusResult, setStatusResult] = useState(null);

    const [isTesting, setIsTesting] = useState(false);
    const [isReloading, setIsReloading] = useState(false);
    const [isCheckingStatus, setIsCheckingStatus] = useState(false);
    
    // Track if any action has been performed for better UX
    const [hasPerformedAction, setHasPerformedAction] = useState(false);

    const handleAction = async (actionType, endpoint, setResult, setLoadingState) => {
        setLoadingState(true);
        setResult(null); // Clear previous result
        setError(null); // Clear previous API error
        let currentError = null; // Local error state for this specific action
        setHasPerformedAction(true); // Mark that user has performed an action

        try {
            const data = await request(endpoint, { method: 'POST' });
            setResult(data);
        } catch (err) {
            console.error(`Failed to run ${actionType}:`, err);
            currentError = err.message || `Failed to run ${actionType}`;
            // Set API error state for display in the specific result component
            setResult(null); // Ensure no stale result is shown on error
        } finally {
            setLoadingState(false);
        }
        return currentError; // Return error message if any
    };


    const handleTest = async () => {
        const error = await handleAction('Test Configuration', '/nginx/actions/test', setTestResult, setIsTesting);
         setReloadResult(null); // Clear other results when running a new action
         setStatusResult(null);
         if (error) setTestResult({ error }); // Pass error to display component
    };

    const handleReload = async () => {
         const error = await handleAction('Reload Service', '/nginx/actions/reload', setReloadResult, setIsReloading);
         setTestResult(null);
         setStatusResult(null);
         if (error) setReloadResult({ error });
    };

    const handleStatus = async () => {
         const error = await handleAction('Check Status', '/nginx/actions/status', setStatusResult, setIsCheckingStatus);
         setTestResult(null);
         setReloadResult(null);
         if (error) setStatusResult({ error });
    };

    const isLoading = isTesting || isReloading || isCheckingStatus;

    return (
        <div className="transition-all duration-300">
            <Card className="mb-4 bg-card border-border">
                <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">
                        Trigger Nginx service actions. These require appropriate permissions for the backend process user (e.g., sudo without password for nginx/systemctl).
                    </p>
                </CardContent>
            </Card>
            
            {/* Display general API errors if they occur outside specific actions */}
            {apiError && !isLoading && (
                <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>API Error</AlertTitle>
                    <AlertDescription>{apiError}</AlertDescription>
                </Alert>
            )}

            {/* Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Test Action */}
                <Card className="transition-all hover:shadow-md">
                    <CardHeader>
                        <div className="flex items-center space-x-2">
                            <Zap className="h-5 w-5 text-primary" />
                            <CardTitle>Test Configuration</CardTitle>
                        </div>
                        <CardDescription>
                            Run <code className="bg-muted px-1 rounded">nginx -t</code> to validate syntax.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button 
                            onClick={handleTest} 
                            disabled={isLoading} 
                            className="w-full" 
                            variant={isTesting ? "outline" : "default"}
                        >
                            {isTesting ? (
                                <span className="flex items-center">
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    Testing...
                                </span>
                            ) : "Run Test"}
                        </Button>
                    </CardContent>
                </Card>

                {/* Reload Action */}
                <Card className="transition-all hover:shadow-md">
                    <CardHeader>
                        <div className="flex items-center space-x-2">
                            <RefreshCw className="h-5 w-5 text-primary" />
                            <CardTitle>Reload Service</CardTitle>
                        </div>
                        <CardDescription>
                            Run <code className="bg-muted px-1 rounded">systemctl reload nginx</code> to apply changes.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button 
                            onClick={handleReload} 
                            disabled={isLoading} 
                            className="w-full" 
                            variant={isReloading ? "outline" : "default"}
                        >
                            {isReloading ? (
                                <span className="flex items-center">
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    Reloading...
                                </span>
                            ) : "Reload Nginx"}
                        </Button>
                    </CardContent>
                </Card>

                {/* Status Action */}
                <Card className="transition-all hover:shadow-md">
                    <CardHeader>
                        <div className="flex items-center space-x-2">
                            <Activity className="h-5 w-5 text-primary" />
                            <CardTitle>Check Status</CardTitle>
                        </div>
                        <CardDescription>
                            Run <code className="bg-muted px-1 rounded">systemctl status nginx</code>.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button 
                            onClick={handleStatus} 
                            disabled={isLoading} 
                            className="w-full" 
                            variant={isCheckingStatus ? "outline" : "default"}
                        >
                            {isCheckingStatus ? (
                                <span className="flex items-center">
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    Checking...
                                </span>
                            ) : "Get Status"}
                        </Button>
                    </CardContent>
                </Card>
            </div>
            
            {/* Results Display Section */}
            <div className="space-y-4">
                {(isTesting || testResult || testResult?.error) && (
                    <ActionResultDisplay 
                        title="Nginx Test" 
                        result={testResult} 
                        loading={isTesting} 
                        error={testResult?.error} 
                    />
                )}
                
                {(isReloading || reloadResult || reloadResult?.error) && (
                    <ActionResultDisplay 
                        title="Nginx Reload" 
                        result={reloadResult} 
                        loading={isReloading} 
                        error={reloadResult?.error} 
                    />
                )}
                
                {(isCheckingStatus || statusResult || statusResult?.error) && (
                    <ActionResultDisplay 
                        title="Nginx Status" 
                        result={statusResult} 
                        loading={isCheckingStatus} 
                        error={statusResult?.error} 
                    />
                )}
            </div>
            
            {!hasPerformedAction && !isLoading && (
                <div className="text-center p-4 text-muted-foreground animate-fadeIn">
                    <HelpCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>Choose an action above to manage your Nginx service</p>
                </div>
            )}
        </div>
    );
};

export default NginxActions;