import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Chrome, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Play, 
  Pause,
  MessageSquare,
  Database,
  Settings,
  Bug,
  Activity
} from 'lucide-react';

interface ExtensionStatus {
  isInstalled: boolean;
  isConnected: boolean;
  version?: string;
  permissions: string[];
  activeTab?: string;
}

interface LogEntry {
  timestamp: string;
  type: 'debug' | 'info' | 'warning' | 'error' | 'success';
  source: 'webapp' | 'extension' | 'background' | 'system';
  message: string;
  data?: any;
  id: string;
}

const MAX_LOGS = 200;

export default function ChromeExtensionBridge() {
  const [extensionStatus, setExtensionStatus] = useState<ExtensionStatus>({
    isInstalled: false,
    isConnected: false,
    permissions: []
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [logFilter, setLogFilter] = useState<LogEntry['type'] | 'all'>('all');
  const [testResults, setTestResults] = useState<Record<string, 'pending' | 'success' | 'error'>>({});

  const addLog = React.useCallback((type: LogEntry['type'], source: LogEntry['source'], message: string, data?: any) => {
    const newLog: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toISOString(),
      type,
      source,
      message,
      data
    };
    setLogs(prev => [newLog, ...prev.slice(0, MAX_LOGS - 1)]);
  }, []);

  // Check if Chrome extension is available
  const checkExtensionStatus = React.useCallback(async () => {
    try {
      // Check if we're in a browser environment first
      if (typeof window === 'undefined') {
        addLog('error', 'webapp', 'Not running in browser environment');
        return;
      }

      const isInstalled = !!(window as any).chrome?.runtime;
      
      if (isInstalled) {
        addLog('success', 'webapp', 'Chrome extension detected');
        setExtensionStatus(prev => ({ ...prev, isInstalled: true }));
        
        try {
          const manifest = (window as any).chrome?.runtime?.getManifest?.();
          if (manifest) {
            setExtensionStatus(prev => ({ 
              ...prev, 
              version: manifest.version,
              permissions: manifest.permissions || []
            }));
          }
        } catch (e: any) {
          addLog('warning', 'webapp', 'Could not get extension manifest', { error: e.message });
        }
      } else {
        addLog('error', 'webapp', 'Chrome extension not detected. Please ensure it is installed and enabled.');
        setExtensionStatus(prev => ({ ...prev, isInstalled: false, isConnected: false, version: undefined, permissions: [] }));
      }
    } catch (error: any) {
      addLog('error', 'webapp', 'Error checking extension status', { error: error.message });
      setExtensionStatus(prev => ({ ...prev, isInstalled: false, isConnected: false }));
    }
  }, [addLog]);

  // Test different extension functionalities
  const runDiagnostics = React.useCallback(async () => {
    setTestResults({});
    addLog('info', 'webapp', 'Starting diagnostics...');

    const tests = [
      {
        name: 'Extension Detection',
        test: async () => {
          const detected = !!(window as any).chrome?.runtime;
          return detected;
        }
      },
      {
        name: 'Content Script Injection',
        test: async () => {
          return new Promise((resolve) => {
            if (window.location.hostname.includes('youtube.com')) {
              const trackerButton = document.getElementById('football-tracker-launch-btn');
              resolve(!!trackerButton);
            } else {
              resolve(false);
            }
          });
        }
      },
      {
        name: 'Background Script Communication',
        test: async () => {
          return new Promise((resolve) => {
            try {
              if (!(window as any).chrome?.runtime?.sendMessage) {
                resolve(false);
                return;
              }
              
              (window as any).chrome.runtime.sendMessage(
                { type: 'PING' },
                (response: any) => {
                  resolve(!!response);
                }
              );
              setTimeout(() => resolve(false), 2000);
            } catch {
              resolve(false);
            }
          });
        }
      },
      {
        name: 'Storage Access',
        test: async () => {
          return new Promise((resolve) => {
            try {
              if (!(window as any).chrome?.storage?.local) {
                resolve(false);
                return;
              }
              
              (window as any).chrome.storage.local.get(['test'], (result: any) => {
                resolve(!!(window as any).chrome?.runtime?.lastError === undefined);
              });
            } catch {
              resolve(false);
            }
          });
        }
      }
    ];

    for (const test of tests) {
      try {
        setTestResults(prev => ({ ...prev, [test.name]: 'pending' }));
        const result = await test.test();
        const status = result ? 'success' : 'error';
        setTestResults(prev => ({ ...prev, [test.name]: status }));
        addLog(status, 'webapp', `${test.name}: ${result ? 'PASSED' : 'FAILED'}`);
      } catch (error: any) {
        setTestResults(prev => ({ ...prev, [test.name]: 'error' }));
        addLog('error', 'webapp', `${test.name}: ERROR during diagnostics`, { error: error.message, testName: test.name });
      }
    }
    addLog('info', 'webapp', 'Diagnostics complete.');
  }, [addLog]);

  // Simulate extension messages for testing
  const testExtensionMessage = React.useCallback((messageType: string) => {
    try {
      const testMessage = {
        type: messageType,
        timestamp: Date.now(),
        data: { test: true }
      };
      
      addLog('info', 'webapp', `Sending test message: ${messageType}`, testMessage);
      
      if ((window as any).chrome?.runtime?.sendMessage) {
        (window as any).chrome.runtime.sendMessage(testMessage, (response: any) => {
          const lastError = (window as any).chrome.runtime.lastError;
          if (lastError) {
            addLog('error', 'webapp', `Message failed: ${messageType}`, { error: lastError.message, details: lastError });
          } else {
            addLog('success', 'webapp', `Message sent successfully: ${messageType}`, response);
          }
        });
      } else {
        addLog('error', 'webapp', 'Chrome runtime or sendMessage API not available. Is the extension installed and active?');
      }
    } catch (error: any) {
      addLog('error', 'webapp', `Error sending message: ${messageType}`, { error: error.message });
    }
  }, [addLog]);

  const sanitizeString = React.useCallback((str: string): string => {
    if (typeof str !== 'string') return '';
    const BANNED_CHARS_REGEX = /[<>&"'`]/g;
    const map: Record<string, string> = {
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      '"': '&quot;',
      "'": '&#x27;',
      '`': '&#x60;'
    };
    return str.replace(BANNED_CHARS_REGEX, (match) => map[match]);
  }, []);

  // Memoized listener for messages from the extension
  const handleExtensionMessage = React.useCallback((message: any, sender: any) => {
    if (sender.id !== (window as any).chrome?.runtime?.id) {
      addLog('warning', 'webapp', 'Received message from unexpected sender ID.', { senderId: sender.id, expectedId: (window as any).chrome?.runtime?.id });
      return;
    }

    addLog('info', 'extension', `Received message: ${message.type}`, message.payload);

    if (message.type === 'EXTENSION_STATUS_UPDATE') {
      setExtensionStatus(prev => {
        const newActiveTab = message.payload?.activeTabUrl ? sanitizeString(message.payload.activeTabUrl) : undefined;
        if (prev.isConnected !== message.payload?.isConnected || prev.activeTab !== newActiveTab) {
          return {
            ...prev,
            isConnected: message.payload?.isConnected,
            activeTab: newActiveTab,
          };
        }
        return prev;
      });
    }
  }, [addLog, sanitizeString]);

  useEffect(() => {
    checkExtensionStatus();

    // Set up extension message listener
    if (typeof window !== 'undefined' && (window as any).chrome?.runtime?.onMessage) {
      (window as any).chrome.runtime.onMessage.addListener(handleExtensionMessage);
      addLog('debug', 'system', 'Extension message listener attached.');
    }
    
    let intervalId: NodeJS.Timeout | null = null;
    if (isMonitoring) {
      addLog('info', 'system', 'Monitoring started.');
      intervalId = setInterval(() => {
        addLog('debug', 'system', 'Monitoring heartbeat', { 
          isConnected: extensionStatusRef.current.isConnected,
          activeTab: extensionStatusRef.current.activeTab 
        });
      }, 30000);
    } else {
      if (logs.some(log => log.message === 'Monitoring started.')) {
        addLog('info', 'system', 'Monitoring stopped.');
      }
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
      if (typeof window !== 'undefined' && (window as any).chrome?.runtime?.onMessage) {
        (window as any).chrome.runtime.onMessage.removeListener(handleExtensionMessage);
        addLog('debug', 'system', 'Extension message listener detached.');
      }
    };
  }, [checkExtensionStatus, addLog, isMonitoring, handleExtensionMessage]);

  const extensionStatusRef = React.useRef(extensionStatus);
  useEffect(() => {
    extensionStatusRef.current = extensionStatus;
  }, [extensionStatus]);

  const getStatusIcon = React.useCallback((status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending': return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      default: return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    }
  }, []);

  const getLogIcon = React.useCallback((type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'info': return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'debug': return <Bug className="w-4 h-4 text-gray-400" />;
      default: return <MessageSquare className="w-4 h-4 text-gray-500" />;
    }
  }, []);

  const filteredLogs = React.useMemo(() => {
    if (logFilter === 'all') return logs;
    return logs.filter(log => log.type === logFilter);
  }, [logs, logFilter]);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <header className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6 pb-4 border-b">
        <div className="flex items-center gap-3">
          <Chrome className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl sm:text-3xl font-bold">Chrome Extension Bridge</h1>
        </div>
        <Badge 
          variant={extensionStatus.isInstalled && extensionStatus.isConnected ? "default" : "destructive"} 
          className="px-3 py-1 text-sm self-center sm:self-auto"
        >
          <span className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${extensionStatus.isInstalled && extensionStatus.isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></span>
          {extensionStatus.isInstalled ? (extensionStatus.isConnected ? "Bridge Connected" : "Extension Found, Bridge Disconnected") : "Extension Not Found"}
        </Badge>
      </header>

      {/* Status Overview */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Extension Details</CardTitle>
            <Chrome className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-2">
              {extensionStatus.isInstalled ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              <span className="text-lg font-bold">
                {extensionStatus.isInstalled ? "Installed" : "Not Detected"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Version: {extensionStatus.version ? sanitizeString(extensionStatus.version) : 'N/A'}
            </p>
            {extensionStatus.isInstalled && (
              <p className="text-xs text-muted-foreground mt-1">
                Permissions: {extensionStatus.permissions.length > 0 ? extensionStatus.permissions.length : '0'} granted
              </p>
            )}
            {extensionStatus.activeTab && (
              <p className="text-xs text-muted-foreground mt-1 truncate" title={`Current active tab reported by extension: ${extensionStatus.activeTab}`}>
                Active Tab: {sanitizeString(extensionStatus.activeTab)}
              </p>
            )}
            {!extensionStatus.isInstalled && (
                 <Alert variant="destructive" className="mt-3 text-xs p-2">
                    <AlertTriangle className="h-3 w-3" />
                    <AlertDescription className="ml-1">
                        Extension not found. Please ensure it's installed and enabled.
                    </AlertDescription>
                </Alert>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-200 relative">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Real-time Monitoring</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={isMonitoring ? "outline" : "default"}
                onClick={() => setIsMonitoring(!isMonitoring)}
                className="w-full"
              >
                {isMonitoring ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                {isMonitoring ? "Stop Monitoring" : "Start Monitoring"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Status: {isMonitoring ? <span className="font-semibold text-green-600">Active</span> : <span className="font-semibold text-gray-600">Inactive</span>}
            </p>
             {isMonitoring && <RefreshCw className="w-3 h-3 text-green-500 animate-spin absolute top-4 right-4" />}
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Troubleshooting</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              size="sm" 
              onClick={checkExtensionStatus} 
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Status
            </Button>
            <Button 
              size="sm" 
              onClick={runDiagnostics} 
              className="w-full"
            >
              <Bug className="w-4 h-4 mr-2" />
              Run Diagnostics
            </Button>
          </CardContent>
        </Card>
      </section>

      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-2 text-sm sm:text-base">
          <TabsTrigger value="logs"><Activity className="w-4 h-4 mr-2 sm:inline hidden"/>Activity Logs</TabsTrigger>
          <TabsTrigger value="diagnostics"><Bug className="w-4 h-4 mr-2 sm:inline hidden"/>Diagnostics</TabsTrigger>
          <TabsTrigger value="testing"><MessageSquare className="w-4 h-4 mr-2 sm:inline hidden"/>Message Testing</TabsTrigger>
          <TabsTrigger value="permissions"><CheckCircle className="w-4 h-4 mr-2 sm:inline hidden"/>Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="diagnostics" className="space-y-4">
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="text-xl">System Diagnostics</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                  Run these tests to check core functionalities of the extension bridge. Results will appear below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.keys(testResults).length === 0 && !logs.find(log => log.message === 'Starting diagnostics...') && (
                <div className="text-center text-muted-foreground py-8 px-4">
                  <Bug className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 text-gray-400" />
                  <p className="mb-3 text-base sm:text-lg">No diagnostic tests have been run yet.</p>
                  <Button onClick={runDiagnostics} variant="outline" size="sm">
                     <Play className="w-4 h-4 mr-2"/> Run Diagnostics Now
                  </Button>
                </div>
              )}
               {logs.find(log => log.message === 'Starting diagnostics...') && Object.keys(testResults).length === 0 && (
                 <div className="text-center text-muted-foreground py-8 px-4">
                    <RefreshCw className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 text-blue-500 animate-spin" />
                    <p className="text-base sm:text-lg">Diagnostics in progress...</p>
                 </div>
               )}
              {Object.keys(testResults).length > 0 && (
                <div className="space-y-2 pt-4 border-t mt-4">
                  {Object.entries(testResults).map(([test, status]) => (
                    <div key={test} className="flex items-center justify-between p-3 border rounded">
                      <span className="font-medium">{test}</span>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(status)}
                        <Badge variant={status === 'success' ? 'default' : status === 'error' ? 'destructive' : 'secondary'}>
                          {status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-xl">Activity Logs</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  Detailed events from the application and extension. Max {MAX_LOGS} logs are kept.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-center">
                <select
                  value={logFilter}
                  onChange={(e) => setLogFilter(e.target.value as LogEntry['type'] | 'all')}
                  className="p-2 border rounded text-xs sm:text-sm bg-background text-foreground focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="debug">Debug</option>
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                </select>
                <Button size="sm" variant="outline" onClick={() => { setLogs([]); addLog('info', 'system', 'Logs cleared by user.');}}>
                  Clear Logs
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] lg:h-[500px] border rounded-md p-1">
                {filteredLogs.length > 0 ? (
                  <div className="space-y-2 p-2">
                    {filteredLogs.map((log) => (
                      <div key={log.id} className={`flex items-start gap-3 p-2.5 border rounded text-sm shadow-sm ${
                        log.type === 'error' ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700' : 
                        log.type === 'warning' ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-700' : 
                        'border-gray-200 dark:border-gray-700'
                      }`}>
                        <div className="mt-0.5">{getLogIcon(log.type)}</div>
                        <div className="flex-1 space-y-1">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs capitalize px-1.5 py-0.5">
                                {log.type}
                              </Badge>
                              <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                                {log.source}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </span>
                            </div>
                          </div>
                          <p className="font-medium text-sm">{log.message}</p>
                          {log.data && (
                            <details className="text-xs mt-1">
                              <summary className="cursor-pointer text-muted-foreground hover:text-foreground py-1">
                                View Details
                              </summary>
                              <pre className="mt-1 p-2 bg-muted dark:bg-gray-800 rounded overflow-x-auto text-xs max-h-60">
                                {JSON.stringify(log.data, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-12 px-4">
                     <MessageSquare className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-base sm:text-lg">
                      {logs.length > 0 && logFilter !== 'all' 
                        ? `No logs match filter "${logFilter}".` 
                        : 'No activity recorded yet.'}
                    </p>
                    {logs.length === 0 && <p className="text-xs mt-1">Start monitoring or perform actions to see logs.</p>}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
              <CardTitle  className="text-xl">Message Testing</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Send predefined messages to the extension. Useful for debugging message handlers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button onClick={() => testExtensionMessage('PING')} variant="outline" size="sm">
                  Test Ping <MessageSquare className="w-3 h-3 ml-2"/>
                </Button>
                <Button onClick={() => testExtensionMessage('GET_CONNECTION_DATA')} variant="outline" size="sm">
                  Test Connection Data <Database className="w-3 h-3 ml-2"/>
                </Button>
                <Button onClick={() => testExtensionMessage('START_MATCH_TRACKING')} variant="outline" size="sm">
                  Test Match Tracking <Play className="w-3 h-3 ml-2"/>
                </Button>
                <Button onClick={() => testExtensionMessage('RECORD_EVENT')} variant="outline" size="sm">
                  Test Event Recording <CheckCircle className="w-3 h-3 ml-2"/>
                </Button>
              </div>
              
              <Alert className="text-xs">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Ensure the extension is installed, active, and the relevant page (if any) is open for context-specific messages.
                  Responses and errors will appear in the Activity Logs.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="text-xl">Extension Permissions</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Lists the permissions requested by the detected Chrome extension (from its manifest).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {extensionStatus.isInstalled && extensionStatus.permissions.length > 0 ? (
                <ScrollArea className="h-60 border rounded-md p-3">
                  <div className="space-y-2">
                    {extensionStatus.permissions.map((permission, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 border-b last:border-b-0">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm break-all">{sanitizeString(permission)}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center text-muted-foreground py-12 px-4">
                  <XCircle className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-base sm:text-lg">
                    {extensionStatus.isInstalled 
                      ? "Extension has not declared any permissions." 
                      : "No permission data available (Extension not detected)."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <footer className="text-center text-xs text-muted-foreground pt-4 border-t">
        Chrome Extension Bridge Interface © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
