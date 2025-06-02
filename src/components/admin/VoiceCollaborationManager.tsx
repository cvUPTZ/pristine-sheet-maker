import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Mic, 
  MicOff, 
  Users, 
  Volume2, 
  VolumeX, 
  Phone, 
  PhoneOff, 
  Crown, 
  Shield, 
  AlertTriangle,
  Activity,
  Wifi,
  WifiOff,
  Settings,
  RefreshCw,
  UserX,
  Signal,
  Headphones,
  Speaker,
  Play,
  Pause,
  MoreVertical,
  Search,
  Filter,
  Eye,
  EyeOff,
  Plus
} from 'lucide-react';

interface Match {
  id: string;
  name?: string | null;
  home_team_name: string;
  away_team_name: string;
  match_date?: string | null;
  status: string;
}

interface VoiceRoom {
  id: string;
  name: string;
  match_id: string;
  max_participants: number;
  is_active: boolean;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  created_at: string;
  participant_count?: number;
}

interface VoiceParticipant {
  id: string;
  user_id: string;
  room_id: string;
  is_muted: boolean;
  is_speaking: boolean;
  is_connected: boolean;
  connection_quality: 'excellent' | 'good' | 'fair' | 'poor';
  audio_level: number;
  joined_at: string;
  user_profile?: {
    full_name?: string;
    email?: string;
    role?: string;
  };
  room?: {
    name: string;
  };
}

const VoiceCollaborationManager: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [voiceRooms, setVoiceRooms] = useState<VoiceRoom[]>([]);
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [systemHealth, setSystemHealth] = useState({
    totalRooms: 0,
    activeRooms: 0,
    totalParticipants: 0,
    avgConnectionQuality: 'good' as 'excellent' | 'good' | 'fair' | 'poor',
    issuesDetected: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [isConnectedToDatabase, setIsConnectedToDatabase] = useState(false);

  useEffect(() => {
    fetchMatches();
  }, []);

  useEffect(() => {
    if (selectedMatchId) {
      fetchVoiceData();
    }
  }, [selectedMatchId]);

  const fetchMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('match_date', { ascending: false });

      if (error) throw error;

      setMatches(data || []);
      if (data && data.length > 0 && !selectedMatchId) {
        setSelectedMatchId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
      toast.error('Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  const checkDatabaseConnection = async () => {
    try {
      // Try to query the voice_rooms table to check if it exists
      const { data, error } = await supabase.rpc('get_user_role', { user_id_param: 'test' });
      // If we can call functions, assume database is connected
      setIsConnectedToDatabase(true);
      return true;
    } catch (error) {
      console.log('Voice tables not yet available, using mock data');
      setIsConnectedToDatabase(false);
      return false;
    }
  };

  const fetchVoiceData = async () => {
    if (!selectedMatchId) return;
    
    setRefreshing(true);
    
    try {
      const dbConnected = await checkDatabaseConnection();
      
      if (!dbConnected) {
        // Use mock data until database tables are available
        generateMockData();
        return;
      }

      // Real database queries would go here when tables are available
      // For now, continue using mock data
      generateMockData();
      
    } catch (error) {
      console.error('Error fetching voice data:', error);
      toast.error('Failed to load voice collaboration data');
      generateMockData();
    } finally {
      setRefreshing(false);
    }
  };

  const generateMockData = () => {
    // Generate mock voice rooms
    const mockRooms: VoiceRoom[] = [
      {
        id: '1',
        name: 'Main Commentary Room',
        match_id: selectedMatchId!,
        max_participants: 25,
        is_active: true,
        quality: 'excellent',
        created_at: new Date().toISOString(),
        participant_count: 8
      },
      {
        id: '2',
        name: 'Tactical Analysis Room',
        match_id: selectedMatchId!,
        max_participants: 15,
        is_active: true,
        quality: 'good',
        created_at: new Date().toISOString(),
        participant_count: 5
      },
      {
        id: '3',
        name: 'Statistics Room',
        match_id: selectedMatchId!,
        max_participants: 10,
        is_active: false,
        quality: 'fair',
        created_at: new Date().toISOString(),
        participant_count: 0
      }
    ];

    // Generate mock participants
    const mockParticipants: VoiceParticipant[] = [
      {
        id: '1',
        user_id: 'user1',
        room_id: '1',
        is_muted: false,
        is_speaking: true,
        is_connected: true,
        connection_quality: 'excellent',
        audio_level: 0.8,
        joined_at: new Date().toISOString(),
        user_profile: {
          full_name: 'John Smith',
          email: 'john@example.com',
          role: 'admin'
        },
        room: {
          name: 'Main Commentary Room'
        }
      },
      {
        id: '2',
        user_id: 'user2',
        room_id: '1',
        is_muted: true,
        is_speaking: false,
        is_connected: true,
        connection_quality: 'good',
        audio_level: 0.0,
        joined_at: new Date().toISOString(),
        user_profile: {
          full_name: 'Sarah Johnson',
          email: 'sarah@example.com',
          role: 'coordinator'
        },
        room: {
          name: 'Main Commentary Room'
        }
      },
      {
        id: '3',
        user_id: 'user3',
        room_id: '2',
        is_muted: false,
        is_speaking: false,
        is_connected: true,
        connection_quality: 'fair',
        audio_level: 0.3,
        joined_at: new Date().toISOString(),
        user_profile: {
          full_name: 'Mike Wilson',
          email: 'mike@example.com',
          role: 'analyst'
        },
        room: {
          name: 'Tactical Analysis Room'
        }
      }
    ];

    setVoiceRooms(mockRooms);
    setParticipants(mockParticipants);
    calculateSystemHealth(mockRooms, mockParticipants);
  };

  const calculateSystemHealth = (rooms: VoiceRoom[], participants: VoiceParticipant[]) => {
    const totalParticipants = participants.filter(p => p.is_connected).length;
    const activeRooms = rooms.filter(r => r.is_active).length;
    const poorConnections = participants.filter(p => p.connection_quality === 'poor' && p.is_connected).length;
    
    let avgQuality: 'excellent' | 'good' | 'fair' | 'poor' = 'good';
    if (totalParticipants > 0) {
      if (poorConnections > totalParticipants * 0.3) {
        avgQuality = 'poor';
      } else if (poorConnections === 0) {
        avgQuality = 'excellent';
      } else if (poorConnections > totalParticipants * 0.1) {
        avgQuality = 'fair';
      }
    }
    
    setSystemHealth({
      totalRooms: rooms.length,
      activeRooms,
      totalParticipants,
      avgConnectionQuality: avgQuality,
      issuesDetected: poorConnections
    });
  };

  const handleCreateRoom = async () => {
    if (!selectedMatchId) return;
    
    try {
      // For now, just add to mock data
      const newRoom: VoiceRoom = {
        id: `room-${Date.now()}`,
        name: `Room ${voiceRooms.length + 1}`,
        match_id: selectedMatchId,
        max_participants: 25,
        is_active: true,
        quality: 'good',
        created_at: new Date().toISOString(),
        participant_count: 0
      };

      setVoiceRooms(prev => [...prev, newRoom]);
      toast.success('Voice room created successfully');
    } catch (error) {
      console.error('Error creating room:', error);
      toast.error('Failed to create voice room');
    }
  };

  const handleKickParticipant = async (participantId: string) => {
    try {
      setParticipants(prev => prev.filter(p => p.id !== participantId));
      toast.success('Participant removed from voice room');
    } catch (error) {
      console.error('Error removing participant:', error);
      toast.error('Failed to remove participant');
    }
  };

  const handleMuteParticipant = async (participantId: string) => {
    try {
      setParticipants(prev => prev.map(p => 
        p.id === participantId ? { ...p, is_muted: true } : p
      ));
      toast.success('Participant muted');
    } catch (error) {
      console.error('Error muting participant:', error);
      toast.error('Failed to mute participant');
    }
  };

  const handleCloseRoom = async (roomId: string) => {
    try {
      setVoiceRooms(prev => prev.map(room => 
        room.id === roomId ? { ...room, is_active: false } : room
      ));
      toast.success('Voice room closed');
    } catch (error) {
      console.error('Error closing room:', error);
      toast.error('Failed to close room');
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-emerald-700 bg-emerald-100 border-emerald-200';
      case 'good': return 'text-blue-700 bg-blue-100 border-blue-200';
      case 'fair': return 'text-amber-700 bg-amber-100 border-amber-200';
      case 'poor': return 'text-red-700 bg-red-100 border-red-200';
      default: return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  const getQualityIcon = (quality: string) => {
    switch (quality) {
      case 'excellent': return <Signal className="h-4 w-4 text-emerald-600" />;
      case 'good': return <Wifi className="h-4 w-4 text-blue-600" />;
      case 'fair': return <Activity className="h-4 w-4 text-amber-600" />;
      case 'poor': return <WifiOff className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'admin': return <Crown className="h-4 w-4 text-yellow-600" />;
      case 'coordinator': return <Shield className="h-4 w-4 text-blue-600" />;
      case 'analyst': return <Eye className="h-4 w-4 text-purple-600" />;
      default: return <Users className="h-4 w-4 text-gray-600" />;
    }
  };

  const filteredRooms = voiceRooms.filter(room => {
    const matchesSearch = room.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || 
      (filterStatus === 'active' && room.is_active) ||
      (filterStatus === 'inactive' && !room.is_active);
    return matchesSearch && matchesFilter;
  });

  const getCapacityPercentage = (current: number, max: number) => {
    return Math.round((current / max) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto"></div>
            <Headphones className="h-8 w-8 text-purple-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Loading Voice Manager</h3>
            <p className="text-sm text-gray-500">Connecting to voice collaboration system...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Enhanced Header */}
      <div className="relative overflow-hidden rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-full bg-purple-100">
                <Headphones className="h-8 w-8 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  Voice Collaboration Center
                  <Badge variant="outline" className="bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border-amber-300">
                    <Activity className="h-3 w-3 mr-1" />
                    Demo Mode
                  </Badge>
                </CardTitle>
                <p className="text-gray-600 mt-1">
                  Voice communication management and monitoring (Using mock data until database tables are configured)
                </p>
              </div>
            </div>
            <Button
              onClick={fetchVoiceData}
              disabled={refreshing}
              size="lg"
              className="bg-purple-600 hover:bg-purple-700 shadow-lg"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {matches.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Headphones className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Matches Available</h3>
              <p className="text-gray-500">Create a match to start voice collaboration</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Select Active Match</label>
                <div className="relative">
                  <Select value={selectedMatchId || ''} onValueChange={setSelectedMatchId}>
                    <SelectTrigger className="w-full max-w-lg h-12 bg-white border-2 border-gray-200 hover:border-purple-300 focus:border-purple-500">
                      <SelectValue placeholder="Choose a match to manage" />
                    </SelectTrigger>
                    <SelectContent>
                      {matches.map((match) => (
                        <SelectItem key={match.id} value={match.id} className="py-3">
                          <div className="flex items-center gap-2">
                            <Badge variant={match.status === 'live' ? 'destructive' : 'secondary'} className="text-xs">
                              {match.status.toUpperCase()}
                            </Badge>
                            <span className="font-medium">
                              {match.name || `${match.home_team_name} vs ${match.away_team_name}`}
                            </span>
                            {match.match_date && (
                              <span className="text-gray-500 text-sm">
                                {new Date(match.match_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {!isConnectedToDatabase && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-amber-800">Database Tables Required</h4>
                      <p className="text-amber-700 text-sm mt-1">
                        The voice collaboration tables (voice_rooms, voice_participants) need to be created in your Supabase database. 
                        Currently showing demo data.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </div>

      {selectedMatchId && (
        <>
          {/* System Health Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-blue-800">Total Rooms</p>
                    <p className="text-3xl font-bold text-blue-900">{systemHealth.totalRooms}</p>
                    <p className="text-xs text-blue-600 mt-1">Voice channels</p>
                  </div>
                  <div className="p-3 bg-blue-200 rounded-full">
                    <Speaker className="h-6 w-6 text-blue-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">Active Rooms</p>
                    <p className="text-3xl font-bold text-emerald-900">{systemHealth.activeRooms}</p>
                    <p className="text-xs text-emerald-600 mt-1">Currently live</p>
                  </div>
                  <div className="p-3 bg-emerald-200 rounded-full">
                    <Activity className="h-6 w-6 text-emerald-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-purple-800">Participants</p>
                    <p className="text-3xl font-bold text-purple-900">{systemHealth.totalParticipants}</p>
                    <p className="text-xs text-purple-600 mt-1">Connected users</p>
                  </div>
                  <div className="p-3 bg-purple-200 rounded-full">
                    <Users className="h-6 w-6 text-purple-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={`${systemHealth.avgConnectionQuality === 'good' || systemHealth.avgConnectionQuality === 'excellent' ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200' : 'bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200'} hover:shadow-md transition-shadow`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">Connection Quality</p>
                    <p className="text-xl font-bold capitalize">{systemHealth.avgConnectionQuality}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {getQualityIcon(systemHealth.avgConnectionQuality)}
                      <span className="text-xs">Average</span>
                    </div>
                  </div>
                  <Volume2 className="h-6 w-6 text-gray-600" />
                </div>
              </CardContent>
            </Card>

            <Card className={`${systemHealth.issuesDetected > 0 ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-200' : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200'} hover:shadow-md transition-shadow`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">Issues Detected</p>
                    <p className="text-3xl font-bold">{systemHealth.issuesDetected}</p>
                    <p className="text-xs mt-1">Connection problems</p>
                  </div>
                  <div className={`p-3 rounded-full ${systemHealth.issuesDetected > 0 ? 'bg-red-200' : 'bg-gray-200'}`}>
                    <AlertTriangle className={`h-6 w-6 ${systemHealth.issuesDetected > 0 ? 'text-red-700' : 'text-gray-600'}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="rooms" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-12 bg-gray-100 p-1">
              <TabsTrigger value="rooms" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Speaker className="h-4 w-4" />
                Voice Rooms
              </TabsTrigger>
              <TabsTrigger value="participants" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Users className="h-4 w-4" />
                Participants
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="rooms" className="space-y-6 mt-6">
              {/* Search and Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-lg border shadow-sm">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search rooms..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <Select value={filterStatus} onValueChange={(value: 'all' | 'active' | 'inactive') => setFilterStatus(value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Rooms</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleCreateRoom} className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Room
                  </Button>
                </div>
              </div>

              {/* Room Cards */}
              <div className="grid gap-6">
                {filteredRooms.length === 0 ? (
                  <Card className="border-dashed border-2 border-gray-300">
                    <CardContent className="p-12 text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Speaker className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Voice Rooms Found</h3>
                      <p className="text-gray-500 mb-4">Create your first voice room to start collaborating</p>
                      <Button onClick={handleCreateRoom} className="bg-purple-600 hover:bg-purple-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Voice Room
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  filteredRooms.map((room) => (
                    <Card key={room.id} className="border-l-4 border-l-purple-400 hover:shadow-lg transition-all duration-200 bg-white">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-full ${room.is_active ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                              {room.is_active ? (
                                <Headphones className="h-6 w-6 text-emerald-600" />
                              ) : (
                                <EyeOff className="h-6 w-6 text-gray-400" />
                              )}
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-gray-900">{room.name}</h3>
                              <div className="flex items-center gap-4 mt-2">
                                <Badge 
                                  variant="outline" 
                                  className={`${getQualityColor(room.quality)} border`}
                                >
                                  {getQualityIcon(room.quality)}
                                  <span className="ml-1 capitalize">{room.quality}</span>
                                </Badge>
                                {room.is_active && (
                                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
                                    <Activity className="h-3 w-3 mr-1" />
                                    Live
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" className="hover:bg-gray-50">
                              <Settings className="h-4 w-4 mr-2" />
                              Configure
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleCloseRoom(room.id)}
                              className="hover:bg-red-600"
                            >
                              <PhoneOff className="h-4 w-4 mr-2" />
                              {room.is_active ? 'Close Room' : 'Delete Room'}
                            </Button>
                          </div>
                        </div>
                        
                        {/* Capacity Progress Bar */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="font-medium text-gray-700">Room Capacity</span>
                            <span className="text-gray-600">
                              {room.participant_count || 0} / {room.max_participants} participants
                            </span>
                          </div>
                          <Progress 
                            value={getCapacityPercentage(room.participant_count || 0, room.max_participants)} 
                            className="h-2"
                          />
                        </div>
                        
                        <Separator className="my-4" />
                        
                        {/* Room Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <p className="font-semibold text-gray-900">{room.id.slice(-6).toUpperCase()}</p>
                            <p className="text-gray-600">Room ID</p>
                          </div>
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <p className="font-semibold text-gray-900">{getCapacityPercentage(room.participant_count || 0, room.max_participants)}%</p>
                            <p className="text-gray-600">Capacity</p>
                          </div>
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <p className="font-semibold text-gray-900">{room.is_active ? 'Active' : 'Inactive'}</p>
                            <p className="text-gray-600">Status</p>
                          </div>
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <p className="font-semibold text-gray-900 capitalize">{room.quality}</p>
                            <p className="text-gray-600">Quality</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="participants" className="space-y-6 mt-6">
              <Card className="shadow-sm">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-gray-600" />
                      Active Participants ({participants.length})
                    </div>
                    <Badge variant="outline" className="bg-white">
                      {participants.filter(p => p.is_connected).length} Connected
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {participants.length === 0 ? (
                    <div className="p-12 text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Participants</h3>
                      <p className="text-gray-500">Participants will appear here when they join voice rooms</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {participants.map((participant) => (
                        <div key={participant.id} className="flex items-center justify-between p-6 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <Avatar className="h-12 w-12">
                                <AvatarFallback className={`${participant.is_connected ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'} font-semibold`}>
                                  {participant.user_profile?.full_name?.slice(0, 2).toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${participant.is_connected ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            </div>
                            
                            <div className="flex items-center gap-3">
                              {getRoleIcon(participant.user_profile?.role)}
                              <div>
                                <div className="font-semibold text-gray-900">{participant.user_profile?.full_name || 'Unknown User'}</div>
                                <div className="text-sm text-gray-600">{participant.room?.name}</div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="outline" 
                                className={`${getQualityColor(participant.connection_quality)} border text-xs`}
                              >
                                {getQualityIcon(participant.connection_quality)}
                                <span className="ml-1 capitalize">{participant.connection_quality}</span>
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-6">
                            {/* Audio Status */}
                            <div className="flex items-center gap-3 text-sm">
                              <div className="flex items-center gap-1">
                                {participant.is_muted ? (
                                  <MicOff className="h-4 w-4 text-red-500" />
                                ) : (
                                  <Mic className="h-4 w-4 text-emerald-500" />
                                )}
                                {participant.is_speaking && (
                                  <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                    <span className="text-emerald-600 font-medium">Speaking</span>
                                  </div>
                                )}
                              </div>
                              <div className="text-gray-600">
                                {Math.round(participant.audio_level * 100)}%
                              </div>
                            </div>
                            
                            {/* Connection Time */}
                            <div className="text-xs text-gray-500 min-w-[60px]">
                              {Math.round((Date.now() - new Date(participant.joined_at).getTime()) / 60000)}m ago
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMuteParticipant(participant.id)}
                                disabled={participant.is_muted}
                                className="hover:bg-red-50 hover:border-red-300"
                              >
                                <VolumeX className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleKickParticipant(participant.id)}
                                className="hover:bg-red-600"
                              >
                                <UserX className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6 mt-6">
              <Card className="shadow-sm">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Voice System Configuration
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    Configure voice collaboration settings and monitoring parameters
                  </p>
                </CardHeader>
                <CardContent className="space-y-8 p-6">
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-6">
                    <div className="flex items-start gap-3 mb-4">
                      <AlertTriangle className="h-6 w-6 text-amber-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-amber-800 text-lg">Demo Mode Active</h4>
                        <p className="text-amber-700 mt-2">
                          Voice collaboration system is currently running in demo mode with mock data. 
                          Create the required database tables to enable live functionality.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Settings Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 opacity-50">
                    <div className="space-y-6">
                      <h4 className="font-semibold text-lg text-gray-900 border-b pb-2">Audio Quality Settings</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Minimum Quality Threshold
                          </label>
                          <Select defaultValue="good" disabled>
                            <SelectTrigger className="bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="excellent">Excellent (HD Audio)</SelectItem>
                              <SelectItem value="good">Good (Standard)</SelectItem>
                              <SelectItem value="fair">Fair (Low Bandwidth)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Maximum Participants per Room
                          </label>
                          <Select defaultValue="25" disabled>
                            <SelectTrigger className="bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="10">10 participants</SelectItem>
                              <SelectItem value="25">25 participants</SelectItem>
                              <SelectItem value="50">50 participants</SelectItem>
                              <SelectItem value="100">100 participants</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      <h4 className="font-semibold text-lg text-gray-900 border-b pb-2">Monitoring Settings</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Health Check Interval
                          </label>
                          <Select defaultValue="30" disabled>
                            <SelectTrigger className="bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="15">Every 15 seconds</SelectItem>
                              <SelectItem value="30">Every 30 seconds</SelectItem>
                              <SelectItem value="60">Every minute</SelectItem>
                              <SelectItem value="120">Every 2 minutes</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Auto-Recovery Attempts
                          </label>
                          <Select defaultValue="3" disabled>
                            <SelectTrigger className="bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1 attempt</SelectItem>
                              <SelectItem value="3">3 attempts</SelectItem>
                              <SelectItem value="5">5 attempts</SelectItem>
                              <SelectItem value="10">10 attempts</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Action Buttons */}
                  <div className="flex justify-end gap-4">
                    <Button variant="outline" className="hover:bg-gray-50" disabled>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reset to Defaults
                    </Button>
                    <Button className="bg-purple-600 hover:bg-purple-700" disabled>
                      <Settings className="h-4 w-4 mr-2" />
                      Save Configuration
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default VoiceCollaborationManager;
