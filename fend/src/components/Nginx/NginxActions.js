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
    const [startResult, setStartResult] = useState(null);
    const [stopResult, setStopResult] = useState(null);
    const [restartResult, setRestartResult] = useState(null);
    const [enableResult, setEnableResult] = useState(null);
    const [disableResult, setDisableResult] = useState(null);

    const [isTesting, setIsTesting] = useState(false);
    const [isReloading, setIsReloading] = useState(false);
    const [isCheckingStatus, setIsCheckingStatus] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [isStopping, setIsStopping] = useState(false);
    const [isRestarting, setIsRestarting] = useState(false);
    const [isEnabling, setIsEnabling] = useState(false);
    const [isDisabling, setIsDisabling] = useState(false);
    
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
        clearAllResults(['testResult']);
        if (error) setTestResult({ error });
    };

    const handleReload = async () => {
        const error = await handleAction('Reload Service', '/nginx/actions/reload', setReloadResult, setIsReloading);
        clearAllResults(['reloadResult']);
        if (error) setReloadResult({ error });
    };

    const handleStatus = async () => {
        const error = await handleAction('Check Status', '/nginx/actions/status', setStatusResult, setIsCheckingStatus);
        clearAllResults(['statusResult']);
        if (error) setStatusResult({ error });
    };
    
    const handleStart = async () => {
        const error = await handleAction('Start Service', '/nginx/actions/start', setStartResult, setIsStarting);
        clearAllResults(['startResult']);
        if (error) setStartResult({ error });
    };
    
    const handleStop = async () => {
        const error = await handleAction('Stop Service', '/nginx/actions/stop', setStopResult, setIsStopping);
        clearAllResults(['stopResult']);
        if (error) setStopResult({ error });
    };
    
    const handleRestart = async () => {
        const error = await handleAction('Restart Service', '/nginx/actions/restart', setRestartResult, setIsRestarting);
        clearAllResults(['restartResult']);
        if (error) setRestartResult({ error });
    };
    
    const handleEnable = async () => {
        const error = await handleAction('Enable Service', '/nginx/actions/enable', setEnableResult, setIsEnabling);
        clearAllResults(['enableResult']);
        if (error) setEnableResult({ error });
    };
    
    const handleDisable = async () => {
        const error = await handleAction('Disable Service', '/nginx/actions/disable', setDisableResult, setIsDisabling);
        clearAllResults(['disableResult']);
        if (error) setDisableResult({ error });
    };
    
    // Helper function to clear all results except the one specified
    const clearAllResults = (excludeList = []) => {
        if (!excludeList.includes('testResult')) setTestResult(null);
        if (!excludeList.includes('reloadResult')) setReloadResult(null);
        if (!excludeList.includes('statusResult')) setStatusResult(null);
        if (!excludeList.includes('startResult')) setStartResult(null);
        if (!excludeList.includes('stopResult')) setStopResult(null);
        if (!excludeList.includes('restartResult')) setRestartResult(null);
        if (!excludeList.includes('enableResult')) setEnableResult(null);
        if (!excludeList.includes('disableResult')) setDisableResult(null);
    };

    const isLoading = isTesting || isReloading || isCheckingStatus || 
                     isStarting || isStopping || isRestarting || 
                     isEnabling || isDisabling;

    return (
        <div className="transition-all duration-300">
            
            {/* Display general API errors if they occur outside specific actions */}
            {apiError && !isLoading && (
                <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>API Error</AlertTitle>
                    <AlertDescription>{apiError}</AlertDescription>
                </Alert>
            )}

            {/* Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 gap-4 mb-6">
                {/* Test Action */}
                <Card className="transition-all hover:shadow-md">
                    <CardHeader className="pb-2">
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

                {/* Status Action */}
                <Card className="transition-all hover:shadow-md">
                    <CardHeader className="pb-2">
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

                {/* Reload Action */}
                <Card className="transition-all hover:shadow-md">
                    <CardHeader className="pb-2">
                        <div className="flex items-center space-x-2">
                            <RefreshCw className="h-5 w-5 text-primary" />
                            <CardTitle>Reload Service</CardTitle>
                        </div>
                        <CardDescription>
                            Run <code className="bg-muted px-1 rounded">systemctl reload nginx</code>.
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

                {/* Restart Action */}
                <Card className="transition-all hover:shadow-md">
                    <CardHeader className="pb-2">
                        <div className="flex items-center space-x-2">
                            <Zap className="h-5 w-5 text-primary" />
                            <CardTitle>Restart Service</CardTitle>
                        </div>
                        <CardDescription>
                            Run <code className="bg-muted px-1 rounded">systemctl restart nginx</code>.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button 
                            onClick={handleRestart} 
                            disabled={isLoading} 
                            className="w-full" 
                            variant={isRestarting ? "outline" : "default"}
                        >
                            {isRestarting ? (
                                <span className="flex items-center">
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    Restarting...
                                </span>
                            ) : "Restart Nginx"}
                        </Button>
                    </CardContent>
                </Card>
                
                {/* Start Action */}
                <Card className="transition-all hover:shadow-md">
                    <CardHeader className="pb-2">
                        <div className="flex items-center space-x-2">
                            <Power className="h-5 w-5 text-primary" />
                            <CardTitle>Start Service</CardTitle>
                        </div>
                        <CardDescription>
                            Run <code className="bg-muted px-1 rounded">systemctl start nginx</code>.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button 
                            onClick={handleStart} 
                            disabled={isLoading} 
                            className="w-full" 
                            variant={isStarting ? "outline" : "default"}
                        >
                            {isStarting ? (
                                <span className="flex items-center">
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    Starting...
                                </span>
                            ) : "Start Nginx"}
                        </Button>
                    </CardContent>
                </Card>
                
                {/* Stop Action */}
                <Card className="transition-all hover:shadow-md">
                    <CardHeader className="pb-2">
                        <div className="flex items-center space-x-2">
                            <Power className="h-5 w-5 text-destructive" />
                            <CardTitle>Stop Service</CardTitle>
                        </div>
                        <CardDescription>
                            Run <code className="bg-muted px-1 rounded">systemctl stop nginx</code>.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button 
                            onClick={handleStop} 
                            disabled={isLoading} 
                            className="w-full" 
                            variant={isStopping ? "outline" : "destructive"}
                        >
                            {isStopping ? (
                                <span className="flex items-center">
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    Stopping...
                                </span>
                            ) : "Stop Nginx"}
                        </Button>
                    </CardContent>
                </Card>
                
                {/* Enable Action */}
                <Card className="transition-all hover:shadow-md">
                    <CardHeader className="pb-2">
                        <div className="flex items-center space-x-2">
                            <CheckCircle className="h-5 w-5 text-primary" />
                            <CardTitle>Enable Service</CardTitle>
                        </div>
                        <CardDescription>
                            Run <code className="bg-muted px-1 rounded">systemctl enable nginx</code> to start on boot.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button 
                            onClick={handleEnable} 
                            disabled={isLoading} 
                            className="w-full" 
                            variant={isEnabling ? "outline" : "default"}
                        >
                            {isEnabling ? (
                                <span className="flex items-center">
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    Enabling...
                                </span>
                            ) : "Enable Nginx"}
                        </Button>
                    </CardContent>
                </Card>
                
                {/* Disable Action */}
                <Card className="transition-all hover:shadow-md">
                    <CardHeader className="pb-2">
                        <div className="flex items-center space-x-2">
                            <XCircle className="h-5 w-5 text-destructive" />
                            <CardTitle>Disable Service</CardTitle>
                        </div>
                        <CardDescription>
                            Run <code className="bg-muted px-1 rounded">systemctl disable nginx</code> to not start on boot.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button 
                            onClick={handleDisable} 
                            disabled={isLoading} 
                            className="w-full" 
                            variant={isDisabling ? "outline" : "destructive"}
                        >
                            {isDisabling ? (
                                <span className="flex items-center">
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    Disabling...
                                </span>
                            ) : "Disable Nginx"}
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
                
                {(isCheckingStatus || statusResult || statusResult?.error) && (
                    <ActionResultDisplay 
                        title="Nginx Status" 
                        result={statusResult} 
                        loading={isCheckingStatus} 
                        error={statusResult?.error} 
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
                
                {(isRestarting || restartResult || restartResult?.error) && (
                    <ActionResultDisplay 
                        title="Nginx Restart" 
                        result={restartResult} 
                        loading={isRestarting} 
                        error={restartResult?.error} 
                    />
                )}
                
                {(isStarting || startResult || startResult?.error) && (
                    <ActionResultDisplay 
                        title="Nginx Start" 
                        result={startResult} 
                        loading={isStarting} 
                        error={startResult?.error} 
                    />
                )}
                
                {(isStopping || stopResult || stopResult?.error) && (
                    <ActionResultDisplay 
                        title="Nginx Stop" 
                        result={stopResult} 
                        loading={isStopping} 
                        error={stopResult?.error} 
                    />
                )}
                
                {(isEnabling || enableResult || enableResult?.error) && (
                    <ActionResultDisplay 
                        title="Nginx Enable" 
                        result={enableResult} 
                        loading={isEnabling} 
                        error={enableResult?.error} 
                    />
                )}
                
                {(isDisabling || disableResult || disableResult?.error) && (
                    <ActionResultDisplay 
                        title="Nginx Disable" 
                        result={disableResult} 
                        loading={isDisabling} 
                        error={disableResult?.error} 
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