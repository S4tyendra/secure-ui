import React, { useState } from 'react';
import useApi from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Power, CheckCircle, XCircle, HelpCircle, Zap, RefreshCw, Activity } from 'lucide-react'; // Icons

// Component to display the result of an action
const ActionResultDisplay = ({ title, result, loading, error }) => {
    if (loading) {
        return (
            <div className="mt-4 p-4 border rounded  animate-pulse">
                <p className="text-sm">Running {title}...</p>
            </div>
        );
    }

    if (error) {
        return (
             <Alert variant="destructive" className="mt-4">
                <XCircle className="h-4 w-4" />
               <AlertTitle>Error Running {title}</AlertTitle>
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
        <div className={`mt-4 p-4 border rounded ${isSuccess ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className="flex items-center mb-2">
                {isSuccess ? <CheckCircle className="h-5 w-5 mr-2" /> : <XCircle className="h-5 w-5 text-red-600 mr-2" />}
                <h3 className="text-lg font-semibold">{title} Result: {isSuccess ? 'Success' : 'Failed'}</h3>
                {isStatusCommandPossiblyInactive && <span className="ml-2 text-sm ">(Service likely inactive - exit code 3)</span>}
            </div>
            <p className="text-sm  mb-1">Command: <code className=" px-1 rounded">{result.command}</code></p>
            <p className="text-sm  mb-2">Return Code: {result.return_code}</p>
            {result.message && <p className="text-sm text-gray-700 mb-3 italic">{result.message}</p>}

            {result.stdout && (
                <div className="mb-2">
                    <h4 className="text-sm font-semibold mb-1">stdout:</h4>
                    <pre className="text-xs p-3 rounded overflow-auto max-h-40">{result.stdout}</pre>
                </div>
            )}
             {result.stderr && (
                <div>
                    <h4 className="text-sm font-semibold mb-1 ">stderr:</h4>
                    <pre className=" text-xs p-3 rounded overflow-auto max-h-40">{result.stderr}</pre>
                </div>
            )}
        </div>
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

    const handleAction = async (actionType, endpoint, setResult, setLoadingState) => {
        setLoadingState(true);
        setResult(null); // Clear previous result
        setError(null); // Clear previous API error
        let currentError = null; // Local error state for this specific action

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
        <div>
            <p className="text-sm text-gray-600 mb-4">
                Trigger Nginx service actions. These require appropriate permissions for the backend process user (e.g., sudo without password for nginx/systemctl).
            </p>
            {/* Display general API errors if they occur outside specific actions */}
             {apiError && !isLoading && (
                 <Alert variant="destructive" className="mb-4">
                   <AlertTitle>API Error</AlertTitle>
                   <AlertDescription>{apiError}</AlertDescription>
                 </Alert>
             )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                 {/* Test Action */}
                 <div className="p-4 border rounded shadow-sm">
                     <div className="flex items-center mb-2">
                         <Zap className="h-5 w-5 mr-2 text-blue-600"/>
                         <h3 className="text-lg font-semibold">Test Configuration</h3>
                     </div>
                     <p className="text-sm text-gray-500 mb-3">Run <code className="bg-gray-200 px-1 rounded">nginx -t</code> to validate syntax.</p>
                     <Button onClick={handleTest} disabled={isLoading} className="w-full">
                         {isTesting ? 'Testing...' : 'Run Test'}
                     </Button>
                     <ActionResultDisplay title="Nginx Test" result={testResult} loading={isTesting} error={testResult?.error} />
                 </div>

                 {/* Reload Action */}
                 <div className="p-4 border rounded shadow-sm">
                      <div className="flex items-center mb-2">
                         <RefreshCw className="h-5 w-5 mr-2 text-green-600"/>
                         <h3 className="text-lg font-semibold">Reload Service</h3>
                     </div>
                     <p className="text-sm text-gray-500 mb-3">Run <code className="bg-gray-200 px-1 rounded">systemctl reload nginx</code> to apply changes.</p>
                     <Button onClick={handleReload} disabled={isLoading} className="w-full">
                         {isReloading ? 'Reloading...' : 'Reload Nginx'}
                     </Button>
                      <ActionResultDisplay title="Nginx Reload" result={reloadResult} loading={isReloading} error={reloadResult?.error}/>
                 </div>

                 {/* Status Action */}
                 <div className="p-4 border rounded shadow-sm">
                     <div className="flex items-center mb-2">
                         <Activity className="h-5 w-5 mr-2 text-purple-600"/>
                         <h3 className="text-lg font-semibold">Check Status</h3>
                     </div>
                     <p className="text-sm text-gray-500 mb-3">Run <code className="bg-gray-200 px-1 rounded">systemctl status nginx</code>.</p>
                      <Button onClick={handleStatus} disabled={isLoading} className="w-full">
                         {isCheckingStatus ? 'Checking...' : 'Get Status'}
                     </Button>
                     <ActionResultDisplay title="Nginx Status" result={statusResult} loading={isCheckingStatus} error={statusResult?.error}/>
                 </div>
            </div>
        </div>
    );
};

export default NginxActions;