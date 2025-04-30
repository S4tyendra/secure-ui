// filepath: /media/encrypted_drive/satya/Documents/secure-ui/fend/src/pages/dashboard/nginx/sites/[site].jsx
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import useApi from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft, Save, RefreshCw, Terminal, Code, 
  CheckCircle2, AlarmClockOff, Clock, FileText,
  Ban, AlertCircle, FileCode, Moon, Sun, SplitSquareHorizontal
} from 'lucide-react';

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

const SiteConfigPage = () => {
  const router = useRouter();
  const { site } = router.query; // Get the site name from URL
  const { request, loading, error, setError } = useApi();
  
  // State variables
  const [siteConfig, setSiteConfig] = useState('');
  const [originalConfig, setOriginalConfig] = useState('');
  const [siteDetails, setSiteDetails] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState("editor");
  const [editorTheme, setEditorTheme] = useState("vs-dark");
  const [editorOptions, setEditorOptions] = useState({
    minimap: { enabled: true },
    scrollBeyondLastLine: false,
    fontSize: 14,
    wordWrap: "on",
    lineNumbers: "on"
  });
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  
  const editorRef = useRef(null);
  
  // Check if site content has been changed
  const hasChanges = siteConfig !== originalConfig;

  // Fetch site configuration
  useEffect(() => {
    const fetchSiteConfig = async () => {
      if (!site) return;
      
      setIsFetching(true);
      setError(null);
      setSaveSuccess(false);
      
      try {
        const data = await request(`/nginx/sites/${site}`);
        if (data) {
          setSiteConfig(data.content || '');
          setOriginalConfig(data.content || '');
          setSiteDetails(data);
          setNewSiteName(site);
        }
      } catch (err) {
        console.error(`Failed to fetch site configuration for ${site}:`, err);
      } finally {
        setIsFetching(false);
      }
    };
    
    fetchSiteConfig();
  }, [site, request, setError]);

  // Handle editor instance mount
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

  // Save configuration
  const handleSave = async () => {
    if (!site) return;
    
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);
    
    try {
      await request(`/nginx/sites/${site}`, {
        method: 'PUT',
        body: JSON.stringify({ content: siteConfig }),
      });
      
      setOriginalConfig(siteConfig);
      setSaveSuccess(true);
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(`Failed to save site configuration for ${site}:`, err);
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle site enabled/disabled status
  const handleToggleEnabled = async () => {
    if (!site || !siteDetails) return;
    
    const newStatus = !siteDetails.enabled;
    setError(null);
    
    try {
      await request(`/nginx/sites/${site}`, {
        method: 'PUT',
        body: JSON.stringify({ enable: newStatus }),
      });
      
      // Update local state
      setSiteDetails(prev => ({ ...prev, enabled: newStatus }));
    } catch (err) {
      console.error(`Failed to ${newStatus ? 'enable' : 'disable'} site ${site}:`, err);
    }
  };

  // Discard changes
  const handleDiscard = () => {
    setSiteConfig(originalConfig);
    setError(null);
    setSaveSuccess(false);
  };

  // Rename site
  const handleRenameSite = async () => {
    if (!site || !newSiteName || site === newSiteName) {
      setRenameDialogOpen(false);
      return;
    }
    
    setError(null);
    
    try {
      await request(`/nginx/sites/${site}/rename`, {
        method: 'POST',
        body: JSON.stringify({ new_name: newSiteName }),
      });
      
      // Redirect to the newly renamed site
      router.push(`/dashboard/nginx/sites/${newSiteName}`);
      setRenameDialogOpen(false);
    } catch (err) {
      console.error(`Failed to rename site from ${site} to ${newSiteName}:`, err);
    }
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

  // Format human-readable date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleString();
  };

  const isLoading = isFetching || isSaving || loading;

  if (!site && !isLoading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Site name not provided</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <Head>
          <title>{site ? `Edit ${site} - Nginx Site` : 'Loading Site...'}</title>
        </Head>

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/nginx/sites">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back to Sites
              </Link>
            </Button>
            
            {siteDetails && (
              <div className="flex items-center">
                <h1 className="text-xl font-bold flex items-center">
                  <FileCode className="h-5 w-5 mr-2 text-primary" />
                  {site}
                </h1>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setRenameDialogOpen(true)}
                      className="ml-2"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Rename Site</p></TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {siteDetails && (
              <div className="flex items-center gap-2">
                <Label htmlFor="site-enabled" className="text-sm">
                  {siteDetails.enabled ? 'Enabled' : 'Disabled'}
                </Label>
                <Switch 
                  id="site-enabled" 
                  checked={siteDetails.enabled} 
                  onCheckedChange={handleToggleEnabled}
                  disabled={isLoading}
                />
              </div>
            )}
          </div>
        </div>
        
        {/* Status & Information */}
        {siteDetails && (
          <Card className="mb-4">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p>
                    <Badge variant={siteDetails.enabled ? "default" : "outline"}>
                      {siteDetails.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Modified</p>
                  <p className="font-medium flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatDate(siteDetails.last_modified)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">File Path</p>
                  <p className="font-medium text-sm">
                    {siteDetails.file_path || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Size</p>
                  <p className="font-medium">
                    {siteDetails.size_bytes ? `${(siteDetails.size_bytes / 1024).toFixed(2)} KB` : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Success & Error Messages */}
        {saveSuccess && (
          <Alert className="bg-primary/10 border-primary">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>Site configuration saved successfully.</AlertDescription>
          </Alert>
        )}
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {/* Editor Controls */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
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
          
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={handleDiscard} 
                  variant="outline" 
                  size="sm" 
                  disabled={!hasChanges || isLoading}
                >
                  <Ban className="h-4 w-4 mr-1" />
                  Discard
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Discard Changes</p></TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={handleSave} 
                  variant="default" 
                  size="sm" 
                  disabled={!hasChanges || isLoading}
                >
                  <Save className={`h-4 w-4 mr-1 ${isSaving ? 'animate-pulse' : ''}`} />
                  Save
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Save Changes</p></TooltipContent>
            </Tooltip>
          </div>
        </div>
        
        {/* Editor */}
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
                  height="65vh"
                  language="nginx"
                  theme={editorTheme}
                  value={siteConfig}
                  options={editorOptions}
                  onChange={setSiteConfig}
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
                    {siteConfig}
                  </pre>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        <p className="text-xs text-muted-foreground">
          Note: This will modify the site configuration file. Make sure to validate syntax before applying changes.
        </p>

        {/* Rename Dialog */}
        <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename Site</DialogTitle>
              <DialogDescription>
                Enter a new name for this site configuration.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="new-name" className="text-right">
                  New Name
                </Label>
                <Input
                  id="new-name"
                  placeholder="example.com"
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleRenameSite} disabled={!newSiteName || site === newSiteName}>
                Rename
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Floating Save Button */}
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

export default SiteConfigPage;
