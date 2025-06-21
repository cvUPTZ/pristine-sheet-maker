
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  type: 'info' | 'warning' | 'error' | 'success';
  source: 'webapp' | 'extension' | 'background';
  message: string;
  data?: any;
}

export default function ChromeExtensionBridge() {
  const [extensionStatus, setExtensionStatus] = useState<ExtensionStatus>({
    isInstalled: false,
    isConnected: false,
    permissions: []
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, 'pending' | 'success' | 'error'>>({});

  const addLog = (type: LogEntry['type'], source: LogEntry['source'], message: string, data?: any) => {
    const newLog: LogEntry = {
      timestamp: new Date().toISOString(),
      type,
      source,
      message,
      data
    };
    setLogs(prev => [newLog, ...prev.slice(0, 99)]); // Keep last 100 logs
  };

  // Check if Chrome extension is available
  const checkExtensionStatus = async () => {
    try {
      // Try to detect if extension is installed by checking for injected scripts
      const isInstalled = !!(window as any).chrome?.runtime;
      
      if (isInstalled) {
        addLog('success', 'webapp', 'Chrome extension detected');
        setExtensionStatus(prev => ({ ...prev, isInstalled: true }));
        
        // Try to get extension details
        try {
          const manifest = (window as any).chrome?.runtime?.getManifest?.();
          if (manifest) {
            setExtensionStatus(prev => ({ 
              ...prev, 
              version: manifest.version,
              permissions: manifest.permissions || []
            }));
          }
        } catch (e) {
          addLog('warning', 'webapp', 'Could not get extension manifest');
        }
      } else {
        addLog('error', 'webapp', 'Chrome extension not detected');
        setExtensionStatus(prev => ({ ...prev, isInstalled: false }));
      }
    } catch (error) {
      addLog('error', 'webapp', 'Error checking extension status', error);
    }
  };

  // Test different extension functionalities
  const runDiagnostics = async () => {
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
          // Check if content script is loaded on YouTube
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
              (window as any).chrome?.runtime?.sendMessage(
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
              (window as any).chrome?.storage?.local?.get(['test'], (result: any) => {
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
      } catch (error) {
        setTestResults(prev => ({ ...prev, [test.name]: 'error' }));
        addLog('error', 'webapp', `${test.name}: ERROR`, error);
      }
    }
  };

  // Simulate extension messages for testing
  const testExtensionMessage = (messageType: string) => {
    try {
      const testMessage = {
        type: messageType,
        timestamp: Date.now(),
        data: { test: true }
      };
      
      addLog('info', 'webapp', `Sending test message: ${messageType}`, testMessage);
      
      if ((window as any).chrome?.runtime) {
        (window as any).chrome.runtime.sendMessage(testMessage, (response: any) => {
          if ((window as any).chrome.runtime.lastError) {
            addLog('error', 'webapp', 'Message failed', (window as any).chrome.runtime.lastError);
          } else {
            addLog('success', 'webapp', 'Message sent successfully', response);
          }
        });
      } else {
        addLog('error', 'webapp', 'Chrome runtime not available');
      }
    } catch (error) {
      addLog('error', 'webapp', 'Error sending message', error);
    }
  };

  useEffect(() => {
    checkExtensionStatus();
    
    // Set up monitoring interval
    let interval: NodeJS.Timeout;
    if (isMonitoring) {
      interval = setInterval(() => {
        addLog('info', 'webapp', 'Monitoring heartbeat');
      }, 10000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isMonitoring]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending': return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      default: return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default: return <MessageSquare className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Chrome className="w-8 h-8 text-blue-600" />
        <h1 className="text-3xl font-bold">Chrome Extension Bridge</h1>
        <Badge variant={extensionStatus.isInstalled ? "default" : "destructive"}>
          {extensionStatus.isInstalled ? "Connected" : "Disconnected"}
        </Badge>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Extension Status</CardTitle>
            <Chrome className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {extensionStatus.isInstalled ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              <span className="text-2xl font-bold">
                {extensionStatus.isInstalled ? "Installed" : "Not Found"}
              </span>
            </div>
            {extensionStatus.version && (
              <p className="text-xs text-muted-foreground mt-1">
                Version: {extensionStatus.version}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monitoring</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={isMonitoring ? "destructive" : "default"}
                onClick={() => setIsMonitoring(!isMonitoring)}
              >
                {isMonitoring ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isMonitoring ? "Stop" : "Start"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Real-time monitoring
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actions</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Button size="sm" onClick={checkExtensionStatus} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Status
            </Button>
            <Button size="sm" onClick={runDiagnostics} className="w-full">
              <Bug className="w-4 h-4 mr-2" />
              Run Diagnostics
            </Button>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="diagnostics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
          <TabsTrigger value="logs">Activity Logs</TabsTrigger>
          <TabsTrigger value="testing">Message Testing</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="diagnostics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Diagnostics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.keys(testResults).length > 0 && (
                <div className="space-y-2">
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Activity Logs</CardTitle>
              <Button size="sm" onClick={() => setLogs([])}>
                Clear Logs
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {logs.map((log, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 border rounded text-sm">
                      {getLogIcon(log.type)}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {log.source}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="font-medium">{log.message}</p>
                        {log.data && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-muted-foreground">
                              View Details
                            </summary>
                            <pre className="mt-2 p-2 bg-muted rounded overflow-x-auto">
                              {JSON.stringify(log.data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  ))}
                  {logs.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      No logs yet. Start monitoring to see activity.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Message Testing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button onClick={() => testExtensionMessage('PING')}>
                  Test Ping
                </Button>
                <Button onClick={() => testExtensionMessage('GET_CONNECTION_DATA')}>
                  Test Connection Data
                </Button>
                <Button onClick={() => testExtensionMessage('START_MATCH_TRACKING')}>
                  Test Match Tracking
                </Button>
                <Button onClick={() => testExtensionMessage('RECORD_EVENT')}>
                  Test Event Recording
                </Button>
              </div>
              
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  These are test messages to verify communication with the Chrome extension.
                  Make sure the extension is installed and active.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Extension Permissions</CardTitle>
            </CardHeader>
            <CardContent>
              {extensionStatus.permissions.length > 0 ? (
                <div className="space-y-2">
                  {extensionStatus.permissions.map((permission, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 border rounded">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>{permission}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No permission data available. Extension may not be installed.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
