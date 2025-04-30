import React, { useState, useEffect, useCallback, useRef } from 'react';
import useApi from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
    RefreshCw, Save, Ban, Code, CheckCircle2, Moon, 
    Sun, SplitSquareHorizontal, FileCode, Terminal
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import dynamic from 'next/dynamic';

// Import Monaco Editor dynamically to avoid SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { 
    ssr: false,
    loading: () => (
        <div className="w-full h-[60vh] bg-muted/30 rounded-md flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24 mt-2" />
            </div>
        </div>
    )
});

const NginxConfEditor = () => {
    const { request, loading: apiLoading, error, setError } = useApi();
    const [content, setContent] = useState('');
    const [originalContent, setOriginalContent] = useState(''); // To track changes
    const [isFetching, setIsFetching] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false); // To show success message
    const [activeTab, setActiveTab] = useState("editor"); // For switching between editor and preview
    const [editorTheme, setEditorTheme] = useState("vs-dark"); // Default theme
    const [editorOptions, setEditorOptions] = useState({
        minimap: { enabled: true },
        scrollBeyondLastLine: false,
        fontSize: 14,
        wordWrap: "on",
        lineNumbers: "on"
    });
    const editorRef = useRef(null);

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

    // Store editor instance for potential later use
    const handleEditorDidMount = (editor, monaco) => {
        editorRef.current = editor; 
        // Register nginx language for syntax highlighting
        monaco.languages.register({ id: 'nginx' });
        monaco.languages.setMonarchTokensProvider('nginx', {
            // Basic nginx syntax highlighting rules
            keywords: [
                'server', 'location', 'http', 'events', 'worker_processes', 'include', 'proxy_pass',
                'listen', 'server_name', 'root', 'index', 'try_files', 'error_page', 'return'
            ],
            tokenizer: {
                root: [
                    [/[a-zA-Z_][\w]*/, { cases: { '@keywords': 'keyword' } }],
                    [/[{}]/, 'delimiter.bracket'],
                    [/[;]/, 'delimiter'],
                    [/^\s*#.*$/, 'comment'],
                    [/".*?"/, 'string'],
                    [/'.*?'/, 'string'],
                    [/[0-9]+/, 'number']
                ]
            }
        });
    };

    // Toggle editor theme
    const toggleTheme = () => {
        setEditorTheme(editorTheme === "vs-dark" ? "light" : "vs-dark");
    };

    // Toggle minimap visibility
    const toggleMinimap = () => {
        setEditorOptions({
            ...editorOptions,
            minimap: { enabled: !editorOptions.minimap.enabled }
        });
    };

    const isLoading = isFetching || isSaving;

    return (
        <TooltipProvider>
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold flex items-center">
                        <FileCode className="h-5 w-5 mr-2" />
                        nginx.conf Editor
                    </h2>
                    
                    <div className="flex items-center gap-2">

                        <div className="flex items-center space-x-1">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button 
                                        onClick={toggleTheme} 
                                        variant="outline" 
                                        size="icon" 
                                        className="h-8 w-8"
                                    >
                                        {editorTheme === "vs-dark" ? 
                                            <Sun className="h-3.5 w-3.5" /> : 
                                            <Moon className="h-3.5 w-3.5" />
                                        }
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Toggle Theme</p></TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button 
                                        onClick={toggleMinimap} 
                                        variant="outline" 
                                        size="icon" 
                                        className="h-8 w-8"
                                    >
                                        <SplitSquareHorizontal className="h-3.5 w-3.5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Toggle Minimap</p></TooltipContent>
                            </Tooltip>
                        </div>

                        <div className="flex items-center space-x-1">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button 
                                        onClick={handleDiscard} 
                                        variant="outline" 
                                        size="icon" 
                                        disabled={!hasChanges || isLoading}
                                        className="h-8 w-8"
                                    >
                                        <Ban className="h-3.5 w-3.5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Discard Changes</p></TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button 
                                        onClick={handleSave} 
                                        variant="default" 
                                        size="icon" 
                                        disabled={!hasChanges || isLoading}
                                        className="h-8 w-8"
                                    >
                                        <Save className={`h-3.5 w-3.5 ${isSaving ? 'animate-pulse' : ''}`} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Save Changes</p></TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button 
                                        onClick={fetchConfig} 
                                        variant="outline" 
                                        size="icon" 
                                        disabled={isLoading}
                                        className="h-8 w-8"
                                    >
                                        <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Reload Config from Server</p></TooltipContent>
                            </Tooltip>
                        </div>
                    </div>
                </div>

                {saveSuccess && (
                    <Alert className="bg-primary/10 border-primary">
                        <CheckCircle2 className="h-4 w-4" />
                        <AlertTitle>Success</AlertTitle>
                        <AlertDescription>Nginx configuration saved successfully.</AlertDescription>
                    </Alert>
                )}
                
                {error && (
                    <Alert variant="destructive">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <Card className="border border-border">
                    <CardContent className="p-0">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-[65vh]">
                            <TabsList className="mx-4 mt-2">
                                <TabsTrigger value="editor" className="flex items-center gap-1">
                                    <Code className="h-3.5 w-3.5" />
                                    <span>Editor</span>
                                </TabsTrigger>
                                <TabsTrigger value="raw" className="flex items-center gap-1">
                                    <Terminal className="h-3.5 w-3.5" />
                                    <span>Raw</span>
                                </TabsTrigger>
                            </TabsList>
                            <TabsContent value="editor" className="data-[state=active]:h-full m-0 border-none">
                                <MonacoEditor
                                    height="100%"
                                    language="nginx"
                                    theme={editorTheme}
                                    value={content}
                                    options={editorOptions}
                                    onChange={setContent}
                                    onMount={handleEditorDidMount}
                                    loading={
                                        <div className="h-full w-full flex items-center justify-center">
                                            <RefreshCw className="h-8 w-8 animate-spin opacity-30" />
                                        </div>
                                    }
                                />
                            </TabsContent>
                            
                            <TabsContent value="raw" className="data-[state=active]:h-full m-0 border-none">
                                <div className="h-[65vh] w-full overflow-auto bg-muted p-4 font-mono text-sm">
                                    <pre className="h-full whitespace-pre-wrap break-all">
                                        {content}
                                    </pre>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>

                <p className="text-xs text-muted-foreground">
                    Note: Saving changes here updates the main nginx.conf file. Use with caution. A backup (.bak) should be created by the server.
                </p>

                {hasChanges && (
                    <div className="fixed bottom-4 right-4 z-10">
                        <Button 
                            onClick={handleSave} 
                            variant="default" 
                            size="sm" 
                            disabled={isLoading}
                            className="shadow-lg"
                        >
                            <Save className="h-3.5 w-3.5 mr-2" />
                            Save Changes
                        </Button>
                    </div>
                )}
            </div>
        </TooltipProvider>
    );
};

export default NginxConfEditor;