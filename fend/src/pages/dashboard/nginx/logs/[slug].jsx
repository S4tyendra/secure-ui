import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import useApi from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, ChevronLeft, Download, ArrowDown, Copy, FileText } from 'lucide-react';
import { format } from 'date-fns';

const LogViewer = () => {
    const router = useRouter();
    const { slug } = router.query;
    const { request, loading, error, setError } = useApi();
    
    const [logContent, setLogContent] = useState('');
    const [logDetails, setLogDetails] = useState(null);
    const [tailLines, setTailLines] = useState(100);  // Default to 100 lines
    const [isCopied, setIsCopied] = useState(false);
    
    // Fetch log content with specified tail
    const fetchLogContent = async () => {
        if (!slug) return;
        
        setError(null);
        try {
            // Get log content with specified tail parameter
            const content = await request(`/nginx/logs/${slug}?tail=${tailLines}`, {
                headers: { 'Accept': 'text/plain' }
            });
            setLogContent(content || 'Log is empty or could not be read.');
            
            // Fetch log metadata (size, modification time, etc)
            const logs = await request('/nginx/logs');
            const currentLog = logs.find(log => log.name === slug);
            if (currentLog) {
                setLogDetails(currentLog);
            }
        } catch (err) {
            console.error(`Failed to fetch log content for ${slug}:`, err);
            setLogContent(`Error loading log: ${err.message}`);
        }
    };

    // Initial fetch when slug is available or tailLines changes
    useEffect(() => {
        if (slug) {
            fetchLogContent();
        }
    }, [slug, tailLines]);

    // Copy log content to clipboard
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(logContent);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
    };

    // Handle tailLines input change
    const handleTailChange = (e) => {
        const value = e.target.value;
        if (value === '') {
            setTailLines('');
            return;
        }
        
        const numValue = parseInt(value, 10);
        if (!isNaN(numValue)) {
            setTailLines(numValue);
        }
    };

    // Format bytes helper
    const formatBytes = (bytes, decimals = 2) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    if (!slug) {
        return (
            <div className="flex justify-center items-center h-[50vh]">
                <Skeleton className="h-8 w-8 rounded-full" />
            </div>
        );
    }

    return (
        <>
            <Head>
                <title>Log Viewer - {slug}</title>
            </Head>
            
            <div className="space-y-4">
                {/* Header section with controls */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <Link href="/dashboard/nginx/logs">
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                Back to Logs
                            </Link>
                        </Button>
                        <h1 className="text-xl font-bold">{slug}</h1>
                        {logDetails && (
                            <Badge variant="outline" className="ml-2">
                                {formatBytes(logDetails.size_bytes)}
                            </Badge>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground whitespace-nowrap">Tail lines:</span>
                            <Input
                                type="number"
                                value={tailLines}
                                onChange={handleTailChange}
                                className="w-20 h-9"
                                placeholder="100"
                                min="0"
                            />
                        </div>
                        <Button 
                            onClick={fetchLogContent} 
                            variant="outline" 
                            size="icon" 
                            disabled={loading}
                            className="h-9 w-9"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button 
                            onClick={handleCopy} 
                            variant="outline" 
                            size="icon"
                            className="h-9 w-9"
                        >
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Notification for copied content */}
                {isCopied && (
                    <Alert className="bg-primary/10 border-primary">
                        <AlertTitle>Copied to clipboard</AlertTitle>
                    </Alert>
                )}

                {/* Error alert */}
                {error && (
                    <Alert variant="destructive">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {/* Log details */}
                {logDetails && (
                    <Card className="mb-4">
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">File Size</p>
                                    <p className="font-medium">{formatBytes(logDetails.size_bytes)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Last Modified</p>
                                    <p className="font-medium">
                                        {logDetails.last_modified 
                                            ? format(new Date(logDetails.last_modified * 1000), 'PPpp') 
                                            : 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Log content */}
                <Card className="w-full">
                    <CardHeader className="pb-0">
                        <CardTitle className="flex items-center">
                            <FileText className="h-5 w-5 mr-2" />
                            Log Content
                            {tailLines > 0 && (
                                <span className="text-sm font-normal text-muted-foreground ml-2">
                                    (Showing last {tailLines} lines)
                                </span>
                            )}
                            {tailLines <= 0 && (
                                <span className="text-sm font-normal text-muted-foreground ml-2">
                                    (Showing full file)
                                </span>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-4 w-5/6" />
                                <Skeleton className="h-4 w-2/3" />
                            </div>
                        ) : (
                            <pre className="text-xs overflow-auto bg-muted p-4 rounded-md max-h-[70vh] w-full text-foreground whitespace-pre-wrap">
                                {logContent}
                            </pre>
                        )}
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                            {logContent && !loading && `${logContent.split('\n').length - 1} lines`}
                        </span>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => window.scrollTo(0, document.body.scrollHeight)}
                        >
                            <ArrowDown className="h-4 w-4 mr-1" />
                            Scroll to Bottom
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </>
    );
};

export default LogViewer;
