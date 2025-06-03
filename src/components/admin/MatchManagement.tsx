
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Match, Player } from '@/types';
import { toast } from 'sonner';
import { Trash2, Edit, Eye, Plus } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const MatchManagement: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id,
          name,
          status,
          match_date,
          home_team_name,
          away_team_name,
          home_team_formation,
          away_team_formation,
          home_team_score,
          away_team_score,
          location,
          competition,
          home_team_players,
          away_team_players,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const typedMatches: Match[] = (data || []).map(match => ({
        ...match,
        name: match.name || `${match.home_team_name} vs ${match.away_team_name}`,
        created_at: match.created_at || new Date().toISOString(),
        updated_at: match.updated_at || undefined,
        venue: match.location || undefined,
        home_team_score: match.home_team_score || undefined,
        away_team_score: match.away_team_score || undefined,
        location: match.location || undefined,
        competition: match.competition || undefined,
        home_team_players: parsePlayerData(match.home_team_players),
        away_team_players: parsePlayerData(match.away_team_players)
      }));

      setMatches(typedMatches);
    } catch (error) {
      console.error('Error fetching matches:', error);
      toast.error('Failed to fetch matches');
    } finally {
      setLoading(false);
    }
  };

  const parsePlayerData = (data: any): Player[] => {
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch {
        return [];
      }
    }
    return Array.isArray(data) ? data : [];
  };

  const handleDeleteMatch = async (matchId: string) => {
    if (!confirm('Are you sure you want to delete this match?')) return;

    try {
      const { error } = await supabase
        .from('matches')
        .delete()
        .eq('id', matchId);

      if (error) throw error;

      setMatches(prev => prev.filter(match => match.id !== matchId));
      toast.success('Match deleted successfully');
    } catch (error) {
      console.error('Error deleting match:', error);
      toast.error('Failed to delete match');
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'live':
        return 'destructive';
      case 'completed':
        return 'secondary';
      case 'scheduled':
        return 'default';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className={`flex justify-center items-center ${isMobile ? 'p-4' : 'p-6 sm:p-8'}`}>
        <div className={`animate-spin rounded-full ${isMobile ? 'h-5 w-5' : 'h-6 w-6 sm:h-8 sm:w-8'} border-b-2 border-blue-500`}></div>
        <span className={`ml-2 ${isMobile ? 'text-xs' : 'text-sm sm:text-base'}`}>Loading matches...</span>
      </div>
    );
  }

  return (
    <div className={`space-y-2 sm:space-y-3 lg:space-y-4 ${isMobile ? 'max-w-full' : ''}`}>
      {/* Header Section */}
      <div className="flex flex-col gap-2 sm:gap-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3">
          <div className="min-w-0 flex-1">
            <h2 className={`font-bold text-gray-900 ${isMobile ? 'text-base' : 'text-lg sm:text-xl lg:text-2xl'}`}>
              Match Management
            </h2>
            <p className={`text-gray-600 mt-0.5 ${isMobile ? 'text-xs' : 'text-xs sm:text-sm'}`}>
              Create, edit, and manage football matches
            </p>
          </div>
          <Button 
            onClick={() => navigate('/create-match')}
            className={`${isMobile ? 'w-full text-xs px-3 py-1.5 h-8' : 'text-sm px-3 sm:px-4 py-2'} flex items-center justify-center gap-1.5 flex-shrink-0`}
          >
            <Plus className={`${isMobile ? 'h-3 w-3' : 'h-3 w-3 sm:h-4 sm:w-4'}`} />
            {isMobile ? 'Create Match' : 'Create New Match'}
          </Button>
        </div>
      </div>

      {/* Matches Grid */}
      <div className={`space-y-2 sm:space-y-3 ${isMobile ? 'overflow-hidden' : ''}`}>
        {matches.length === 0 ? (
          <Card className="border-dashed border-2 border-gray-200">
            <CardContent className={`text-center ${isMobile ? 'py-6' : 'py-8 sm:py-12'}`}>
              <div className={`${isMobile ? 'text-3xl mb-3' : 'text-4xl sm:text-5xl mb-4'}`}>⚽</div>
              <p className={`font-medium text-gray-600 mb-2 ${isMobile ? 'text-sm' : 'text-base sm:text-lg'}`}>
                No matches found
              </p>
              <p className={`text-gray-500 mb-3 sm:mb-4 lg:mb-6 ${isMobile ? 'text-xs' : 'text-xs sm:text-sm'}`}>
                Get started by creating your first match
              </p>
              <Button 
                onClick={() => navigate('/create-match')}
                className={`${isMobile ? 'text-xs px-4 py-1.5 h-8' : 'text-sm sm:text-base px-4 sm:px-6 py-2'}`}
              >
                <Plus className={`${isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'}`} />
                Create your first match
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className={`grid gap-2 sm:gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-1'}`}>
            {matches.map((match) => (
              <Card key={match.id} className="hover:shadow-md transition-shadow duration-200">
                <CardHeader className={`${isMobile ? 'pb-2 p-3' : 'pb-3 sm:pb-4'}`}>
                  <div className="flex flex-col gap-2 sm:gap-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-2 sm:gap-3">
                      <div className="flex-1 min-w-0">
                        <CardTitle className={`font-semibold truncate ${isMobile ? 'text-sm' : 'text-base sm:text-lg lg:text-xl'}`}>
                          {match.name}
                        </CardTitle>
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1 sm:mt-2">
                          <Badge 
                            variant={getStatusBadgeVariant(match.status)}
                            className={`${isMobile ? 'text-xs px-1.5 py-0.5' : 'text-xs'}`}
                          >
                            {match.status.toUpperCase()}
                          </Badge>
                          {match.match_date && (
                            <span className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-xs sm:text-sm'}`}>
                              {new Date(match.match_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className={`flex gap-1 ${isMobile ? 'w-full' : 'flex-shrink-0'}`}>
                        <Button
                          variant="outline"
                          size={isMobile ? "sm" : "sm"}
                          onClick={() => navigate(`/match/${match.id}`)}
                          className={`${isMobile ? 'flex-1 text-xs px-2 py-1 h-7' : 'text-xs px-2 py-1'}`}
                        >
                          <Eye className={`${isMobile ? 'h-3 w-3' : 'h-3 w-3 sm:h-4 sm:w-4'}`} />
                          {isMobile && <span className="ml-1">View</span>}
                        </Button>
                        <Button
                          variant="outline"
                          size={isMobile ? "sm" : "sm"}
                          onClick={() => navigate(`/match/${match.id}/edit`)}
                          className={`${isMobile ? 'flex-1 text-xs px-2 py-1 h-7' : 'text-xs px-2 py-1'}`}
                        >
                          <Edit className={`${isMobile ? 'h-3 w-3' : 'h-3 w-3 sm:h-4 sm:w-4'}`} />
                          {isMobile && <span className="ml-1">Edit</span>}
                        </Button>
                        <Button
                          variant="outline"
                          size={isMobile ? "sm" : "sm"}
                          onClick={() => handleDeleteMatch(match.id)}
                          className={`${isMobile ? 'flex-1 text-xs px-2 py-1 h-7' : 'text-xs px-2 py-1'} hover:bg-red-50 hover:border-red-200`}
                        >
                          <Trash2 className={`${isMobile ? 'h-3 w-3' : 'h-3 w-3 sm:h-4 sm:w-4'} text-red-500`} />
                          {isMobile && <span className="ml-1 text-red-500">Del</span>}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className={`${isMobile ? 'pt-0 p-3' : 'pt-0'}`}>
                  {/* Match Details Grid */}
                  <div className={`grid gap-2 sm:gap-3 text-xs sm:text-sm ${isMobile ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'}`}>
                    <div className="space-y-0.5 sm:space-y-1">
                      <span className="font-medium text-gray-700">Home Team:</span>
                      <div className="text-gray-900">
                        {match.home_team_name}
                        {match.home_team_formation && (
                          <span className={`text-gray-500 ${isMobile ? 'block' : 'block sm:inline sm:ml-1'}`}>
                            ({match.home_team_formation})
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-0.5 sm:space-y-1">
                      <span className="font-medium text-gray-700">Away Team:</span>
                      <div className="text-gray-900">
                        {match.away_team_name}
                        {match.away_team_formation && (
                          <span className={`text-gray-500 ${isMobile ? 'block' : 'block sm:inline sm:ml-1'}`}>
                            ({match.away_team_formation})
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {match.location && (
                      <div className="space-y-0.5 sm:space-y-1">
                        <span className="font-medium text-gray-700">Location:</span>
                        <div className="text-gray-900 truncate">{match.location}</div>
                      </div>
                    )}
                    
                    {match.competition && (
                      <div className="space-y-0.5 sm:space-y-1">
                        <span className="font-medium text-gray-700">Competition:</span>
                        <div className="text-gray-900 truncate">{match.competition}</div>
                      </div>
                    )}
                  </div>
                  
                  {/* Score Display */}
                  {(match.home_team_score !== null || match.away_team_score !== null) && (
                    <div className={`${isMobile ? 'mt-3 pt-3' : 'mt-4 pt-4'} border-t border-gray-100`}>
                      <div className="text-center">
                        <div className={`font-bold text-gray-900 ${isMobile ? 'text-base' : 'text-base sm:text-lg lg:text-xl'}`}>
                          {match.home_team_score || 0} - {match.away_team_score || 0}
                        </div>
                        <div className={`text-gray-500 mt-0.5 sm:mt-1 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                          Final Score
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchManagement;
