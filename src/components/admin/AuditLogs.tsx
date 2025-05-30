import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon, FileText, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuditLog {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  user_id: string;
  user_email: string;
  details: any;
  timestamp: string;
}

const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [resourceFilter, setResourceFilter] = useState('all');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  // Mock data for demonstration - in real app, this would come from a proper audit table
  const mockAuditLogs: AuditLog[] = [
    {
      id: '1',
      action: 'CREATE',
      resource_type: 'match',
      resource_id: 'match-001',
      user_id: 'user-1',
      user_email: 'admin@example.com',
      details: { match_name: 'Team A vs Team B' },
      timestamp: new Date().toISOString()
    },
    {
      id: '2',
      action: 'UPDATE',
      resource_type: 'user',
      resource_id: 'user-2',
      user_id: 'user-1',
      user_email: 'admin@example.com',
      details: { role_changed: 'user -> tracker' },
      timestamp: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: '3',
      action: 'DELETE',
      resource_type: 'assignment',
      resource_id: 'assign-001',
      user_id: 'user-1',
      user_email: 'admin@example.com',
      details: { removed_assignment: 'tracker assignment' },
      timestamp: new Date(Date.now() - 7200000).toISOString()
    }
  ];

  useEffect(() => {
    // In a real app, fetch audit logs from database
    // For now, use mock data
    setTimeout(() => {
      setLogs(mockAuditLogs);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.resource_type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesResource = resourceFilter === 'all' || log.resource_type === resourceFilter;
    
    let matchesDate = true;
    if (dateRange.from && dateRange.to) {
      const logDate = new Date(log.timestamp);
      matchesDate = logDate >= dateRange.from && logDate <= dateRange.to;
    }
    
    return matchesSearch && matchesAction && matchesResource && matchesDate;
  });

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-green-100 text-green-800';
      case 'UPDATE': return 'bg-blue-100 text-blue-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      case 'VIEW': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getResourceIcon = (resourceType: string) => {
    switch (resourceType) {
      case 'match': return '⚽';
      case 'user': return '👤';
      case 'assignment': return '📋';
      case 'event': return '📊';
      default: return '📄';
    }
  };

  if (loading) {
    return <div className="p-4">Loading audit logs...</div>;
  }

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
          Audit Logs
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader className="p-4">
            <h3 className="text-md font-semibold flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </h3>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Search by user, action, or resource..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div>
                <Label>Action</Label>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="CREATE">Create</SelectItem>
                    <SelectItem value="UPDATE">Update</SelectItem>
                    <SelectItem value="DELETE">Delete</SelectItem>
                    <SelectItem value="VIEW">View</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Resource Type</Label>
                <Select value={resourceFilter} onValueChange={setResourceFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Resources</SelectItem>
                    <SelectItem value="match">Match</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="assignment">Assignment</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Date Range</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from && dateRange.to ? (
                        `${format(dateRange.from, "PPP")} - ${format(dateRange.to, "PPP")}`
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      defaultMonth={dateRange.from}
                      selected={dateRange.from && dateRange.to ? { from: dateRange.from, to: dateRange.to } : undefined}
                      onSelect={(range) => setDateRange(range || {})}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Audit Logs List */}
        <div className="space-y-3">
          {filteredLogs.length === 0 ? (
            <p className="text-center py-8 text-gray-500">No audit logs found</p>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="border rounded-lg p-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-lg">{getResourceIcon(log.resource_type)}</span>
                      <Badge className={getActionColor(log.action)}>
                        {log.action}
                      </Badge>
                      <Badge variant="outline">
                        {log.resource_type.charAt(0).toUpperCase() + log.resource_type.slice(1)}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm">
                        <span className="font-medium">User:</span> {log.user_email}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Resource ID:</span> {log.resource_id}
                      </p>
                      {log.details && (
                        <p className="text-sm">
                          <span className="font-medium">Details:</span>{' '}
                          {typeof log.details === 'string' 
                            ? log.details 
                            : JSON.stringify(log.details)
                          }
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary Stats */}
        <Card>
          <CardHeader className="p-4">
            <h3 className="text-md font-semibold">Summary</h3>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {filteredLogs.filter(l => l.action === 'CREATE').length}
                </p>
                <p className="text-sm text-gray-500">Creates</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {filteredLogs.filter(l => l.action === 'UPDATE').length}
                </p>
                <p className="text-sm text-gray-500">Updates</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {filteredLogs.filter(l => l.action === 'DELETE').length}
                </p>
                <p className="text-sm text-gray-500">Deletes</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-600">
                  {filteredLogs.length}
                </p>
                <p className="text-sm text-gray-500">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};

export default AuditLogs;
