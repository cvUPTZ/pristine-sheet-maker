import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
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
  Ban,
  UserX
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
  matchId: string;
  participantCount: number;
  maxParticipants: number;
  isActive: boolean;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

interface VoiceParticipant {
  userId: string;
  username: string;
  roomId: string;
  roomName: string;
  isMuted: boolean;
  isSpeaking: boolean;
  isConnected: boolean;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  audioLevel: number;
  role?: 'admin' | 'coordinator' | 'tracker';
  joinedAt: Date;
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

  useEffect(() => {
    fetchMatches();
    // Set up real-time subscriptions for voice activity
    setupRealtimeSubscriptions();
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

  const fetchVoiceData = async () => {
    if (!selectedMatchId) return;
    
    setRefreshing(true);
    try {
      // Simulate fetching voice room data (replace with actual implementation)
      const mockRooms: VoiceRoom[] = [
        {
          id: `${selectedMatchId}_main`,
          name: 'Main Communication',
          matchId: selectedMatchId,
          participantCount: 8,
          maxParticipants: 20,
          isActive: true,
          quality: 'excellent'
        },
        {
          id: `${selectedMatchId}_coordinators`,
          name: 'Match Coordinators',
          matchId: selectedMatchId,
          participantCount: 3,
          maxParticipants: 8,
          isActive: true,
          quality: 'good'
        },
        {
          id: `${selectedMatchId}_team_a`,
          name: 'Team A Trackers',
          matchId: selectedMatchId,
          participantCount: 12,
          maxParticipants: 25,
          isActive: true,
          quality: 'fair'
        },
        {
          id: `${selectedMatchId}_team_b`,
          name: 'Team B Trackers',
          matchId: selectedMatchId,
          participantCount: 15,
          maxParticipants: 25,
          isActive: true,
          quality: 'good'
        }
      ];

      const mockParticipants: VoiceParticipant[] = [
        {
          userId: 'user1',
          username: 'John Coordinator',
          roomId: `${selectedMatchId}_coordinators`,
          roomName: 'Match Coordinators',
          isMuted: false,
          isSpeaking: true,
          isConnected: true,
          connectionQuality: 'excellent',
          audioLevel: 0.8,
          role: 'coordinator',
          joinedAt: new Date(Date.now() - 30000)
        },
        {
          userId: 'user2',
          username: 'Sarah Admin',
          roomId: `${selectedMatchId}_main`,
          roomName: 'Main Communication',
          isMuted: true,
          isSpeaking: false,
          isConnected: true,
          connectionQuality: 'good',
          audioLevel: 0.0,
          role: 'admin',
          joinedAt: new Date(Date.now() - 120000)
        }
      ];

      setVoiceRooms(mockRooms);
      setParticipants(mockParticipants);
      
      // Calculate system health
      const totalParticipants = mockParticipants.length;
      const activeRooms = mockRooms.filter(r => r.isActive).length;
      const poorConnections = mockParticipants.filter(p => p.connectionQuality === 'poor').length;
      
      const avgQuality: 'excellent' | 'good' | 'fair' | 'poor' = poorConnections > totalParticipants * 0.3 ? 'poor' : 'good';
      
      setSystemHealth({
        totalRooms: mockRooms.length,
        activeRooms,
        totalParticipants,
        avgConnectionQuality: avgQuality,
        issuesDetected: poorConnections
      });

    } catch (error) {
      console.error('Error fetching voice data:', error);
      toast.error('Failed to load voice collaboration data');
    } finally {
      setRefreshing(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    // Set up real-time subscriptions for voice room updates
    const channel = supabase.channel('voice_admin');
    
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Voice admin channel subscribed');
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleKickParticipant = async (participantId: string) => {
    try {
      // Implement participant removal logic
      toast.success(`Removed participant ${participantId}`);
      fetchVoiceData(); // Refresh data
    } catch (error) {
      toast.error('Failed to remove participant');
    }
  };

  const handleMuteParticipant = async (participantId: string) => {
    try {
      // Implement participant muting logic
      toast.success(`Muted participant ${participantId}`);
      fetchVoiceData(); // Refresh data
    } catch (error) {
      toast.error('Failed to mute participant');
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-600 bg-green-100';
      case 'good': return 'text-blue-600 bg-blue-100';
      case 'fair': return 'text-yellow-600 bg-yellow-100';
      case 'poor': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'admin': return <Crown className="h-3 w-3 text-yellow-500" />;
      case 'coordinator': return <Shield className="h-3 w-3 text-blue-500" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
        Loading voice collaboration manager...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-l-4 border-l-purple-500">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              🎤 Voice Collaboration Manager
            </div>
            <Button
              onClick={fetchVoiceData}
              disabled={refreshing}
              size="sm"
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardTitle>
          <p className="text-sm text-gray-600">
            Monitor and manage voice rooms, participants, and system health across all matches
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          {matches.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-4">🎤</div>
              <p className="text-lg font-medium">No matches available</p>
              <p className="text-sm">Create a match to start voice collaboration</p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-2">Select Match</label>
              <Select value={selectedMatchId || ''} onValueChange={setSelectedMatchId}>
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Select a match" />
                </SelectTrigger>
                <SelectContent>
                  {matches.map((match) => (
                    <SelectItem key={match.id} value={match.id}>
                      {match.name || `${match.home_team_name} vs ${match.away_team_name}`}
                      {match.match_date && ` - ${new Date(match.match_date).toLocaleDateString()}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedMatchId && (
        <>
          {/* System Health Overview */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-800">Total Rooms</p>
                    <p className="text-2xl font-bold text-blue-900">{systemHealth.totalRooms}</p>
                  </div>
                  <Activity className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-800">Active Rooms</p>
                    <p className="text-2xl font-bold text-green-900">{systemHealth.activeRooms}</p>
                  </div>
                  <Wifi className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-800">Participants</p>
                    <p className="text-2xl font-bold text-purple-900">{systemHealth.totalParticipants}</p>
                  </div>
                  <Users className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card className={`${systemHealth.avgConnectionQuality === 'good' ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Avg Quality</p>
                    <p className="text-lg font-bold capitalize">{systemHealth.avgConnectionQuality}</p>
                  </div>
                  <Volume2 className="h-8 w-8" />
                </div>
              </CardContent>
            </Card>

            <Card className={`${systemHealth.issuesDetected > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Issues</p>
                    <p className="text-2xl font-bold">{systemHealth.issuesDetected}</p>
                  </div>
                  <AlertTriangle className={`h-8 w-8 ${systemHealth.issuesDetected > 0 ? 'text-red-600' : 'text-gray-600'}`} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="rooms" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="rooms">Voice Rooms</TabsTrigger>
              <TabsTrigger value="participants">Participants</TabsTrigger>
              <TabsTrigger value="settings">System Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="rooms" className="space-y-4 mt-4">
              <div className="grid gap-4">
                {voiceRooms.map((room) => (
                  <Card key={room.id} className="border-l-4 border-l-blue-400">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div>
                            <h3 className="font-semibold">{room.name}</h3>
                            <p className="text-sm text-gray-600">
                              {room.participantCount}/{room.maxParticipants} participants
                            </p>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={getQualityColor(room.quality)}
                          >
                            {room.quality}
                          </Badge>
                          {room.isActive && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              Live
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline">
                            <Settings className="h-4 w-4 mr-2" />
                            Manage
                          </Button>
                          <Button size="sm" variant="destructive">
                            <PhoneOff className="h-4 w-4 mr-2" />
                            Close Room
                          </Button>
                        </div>
                      </div>
                      
                      <Separator className="my-3" />
                      
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Room ID:</span>
                          <p className="text-gray-600">{room.id.slice(-8)}</p>
                        </div>
                        <div>
                          <span className="font-medium">Capacity:</span>
                          <p className="text-gray-600">{Math.round((room.participantCount / room.maxParticipants) * 100)}%</p>
                        </div>
                        <div>
                          <span className="font-medium">Status:</span>
                          <p className="text-gray-600">{room.isActive ? 'Active' : 'Inactive'}</p>
                        </div>
                        <div>
                          <span className="font-medium">Quality:</span>
                          <p className="text-gray-600 capitalize">{room.quality}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="participants" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Active Participants ({participants.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {participants.map((participant) => (
                      <div key={participant.userId} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${participant.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                          {getRoleIcon(participant.role)}
                          <div>
                            <div className="font-medium">{participant.username}</div>
                            <div className="text-sm text-gray-600">{participant.roomName}</div>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={getQualityColor(participant.connectionQuality)}
                          >
                            {participant.connectionQuality}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 text-sm">
                            {participant.isMuted ? (
                              <MicOff className="h-4 w-4 text-red-500" />
                            ) : (
                              <Mic className="h-4 w-4 text-green-500" />
                            )}
                            {participant.isSpeaking && (
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            )}
                            <span>{Math.round(participant.audioLevel * 100)}%</span>
                          </div>
                          
                          <div className="text-xs text-gray-500">
                            {Math.round((Date.now() - participant.joinedAt.getTime()) / 60000)}m ago
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMuteParticipant(participant.userId)}
                            >
                              <VolumeX className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleKickParticipant(participant.userId)}
                            >
                              <UserX className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Voice System Settings</CardTitle>
                  <p className="text-sm text-gray-600">
                    Configure global voice collaboration settings and monitoring
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-medium">Quality Settings</h4>
                      <div className="space-y-2">
                        <label className="text-sm">Audio Quality Threshold</label>
                        <Select defaultValue="good">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="excellent">Excellent</SelectItem>
                            <SelectItem value="good">Good</SelectItem>
                            <SelectItem value="fair">Fair</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm">Max Participants per Room</label>
                        <Select defaultValue="25">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h4 className="font-medium">Monitoring Settings</h4>
                      <div className="space-y-2">
                        <label className="text-sm">Health Check Interval</label>
                        <Select defaultValue="30">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 seconds</SelectItem>
                            <SelectItem value="30">30 seconds</SelectItem>
                            <SelectItem value="60">1 minute</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm">Auto-Recovery Attempts</label>
                        <Select defaultValue="3">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1</SelectItem>
                            <SelectItem value="3">3</SelectItem>
                            <SelectItem value="5">5</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-end gap-2">
                    <Button variant="outline">Reset to Defaults</Button>
                    <Button>Save Settings</Button>
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
