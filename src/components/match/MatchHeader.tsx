import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Flag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TeamHeaderData {
  name: string;
  formation?: string;
  score?: number;
  flagUrl?: string | null;
}

type MatchStatus = 'live' | 'upcoming' | 'finished' | 'postponed';

interface MatchHeaderProps {
  homeTeam: TeamHeaderData;
  awayTeam: TeamHeaderData;
  name?: string;
  status?: MatchStatus;
  matchId?: string;
}

// Helper function to generate a vibrant color from a string
const generateColorFromString = (str: string): string => {
  if (!str) return '#333333';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = hash % 360;
  return `hsl(${h}, 60%, 35%)`; // Darker, saturated colors for background
};

const MatchHeader: React.FC<MatchHeaderProps> = ({
  homeTeam,
  awayTeam,
  name,
  status,
  matchId,
}) => {
  const [flagErrors, setFlagErrors] = useState<{
    home: boolean;
    away: boolean;
  }>({ home: false, away: false });
  
  const [teamFlags, setTeamFlags] = useState<{
    homeTeamFlagUrl?: string | null;
    awayTeamFlagUrl?: string | null;
  }>({});
  
  const [isLoading, setIsLoading] = useState(false);

  // Fetch flag URLs from database when matchId is provided
  useEffect(() => {
    const fetchFlagUrls = async () => {
      if (!matchId) return;

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('matches')
          .select('home_team_flag_url, away_team_flag_url')
          .eq('id', matchId)
          .single();

        if (error) {
          console.error('Error fetching flag URLs:', error);
          return;
        }

        if (data) {
          setTeamFlags({
            homeTeamFlagUrl: data.home_team_flag_url,
            awayTeamFlagUrl: data.away_team_flag_url,
          });
        }
      } catch (error) {
        console.error('Error in fetchFlagUrls:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFlagUrls();
  }, [matchId]);

  // Use database flag URLs if available, otherwise fall back to props
  const homeFlagUrl = teamFlags.homeTeamFlagUrl || homeTeam.flagUrl;
  const awayFlagUrl = teamFlags.awayTeamFlagUrl || awayTeam.flagUrl;

  const homeColor = generateColorFromString(homeTeam.name);
  const awayColor = generateColorFromString(awayTeam.name);

  const gradientStyle = {
    background: `linear-gradient(90deg, ${homeColor} 0%, ${awayColor} 100%)`,
  };

  const handleFlagError = (team: 'home' | 'away') => {
    setFlagErrors(prev => ({ ...prev, [team]: true }));
  };

  const getStatusColor = (status?: MatchStatus): string => {
    switch (status) {
      case 'live':
        return 'bg-red-500/80 text-white';
      case 'finished':
        return 'bg-gray-500/80 text-white';
      case 'upcoming':
        return 'bg-blue-500/80 text-white';
      case 'postponed':
        return 'bg-yellow-500/80 text-black';
      default:
        return 'bg-white/20 text-white';
    }
  };

  return (
    <Card style={gradientStyle} className="mb-4 text-white shadow-lg overflow-hidden relative border-none">
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />
      <CardContent className="relative p-4 sm:p-5">
        <div className="flex justify-between items-center">
          {/* Home Team */}
          <div className="flex flex-1 items-center gap-3 sm:gap-4 text-left">
            <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-white/50">
              {homeFlagUrl && !flagErrors.home ? (
                <AvatarImage 
                  src={homeFlagUrl} 
                  alt={`${homeTeam.name} flag`}
                  className="object-cover"
                  onError={() => handleFlagError('home')}
                />
              ) : (
                <AvatarFallback className="bg-white/20 text-white">
                  <Flag className="h-5 w-5 sm:h-6 sm:w-6" />
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <h2 className="text-lg sm:text-2xl font-bold truncate" title={homeTeam.name}>
                {homeTeam.name}
              </h2>
              <p className="text-xs sm:text-sm opacity-80">
                {homeTeam.formation || '4-4-2'}
              </p>
            </div>
          </div>

          {/* Center Section - Score and Match Info */}
          <div className="flex-1 text-center px-2">
            {/* Score Display */}
            {(homeTeam.score !== undefined || awayTeam.score !== undefined) && (
              <div className="text-2xl sm:text-3xl font-bold mb-1">
                {homeTeam.score ?? 0} - {awayTeam.score ?? 0}
              </div>
            )}
            
            {/* Match Name */}
            <h1 className="text-sm sm:text-lg font-semibold truncate hidden sm:block" title={name}>
              {name || 'Match'}
            </h1>
            
            {/* Status Badge */}
            {status && (
              <Badge
                variant="secondary"
                className={`mt-1 border-none text-xs backdrop-blur-sm ${getStatusColor(status)}`}
              >
                {status.toUpperCase()}
              </Badge>
            )}
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="text-xs opacity-70 mt-1">Loading...</div>
            )}
          </div>

          {/* Away Team */}
          <div className="flex flex-1 items-center gap-3 sm:gap-4 text-right justify-end">
            <div>
              <h2 className="text-lg sm:text-2xl font-bold truncate" title={awayTeam.name}>
                {awayTeam.name}
              </h2>
              <p className="text-xs sm:text-sm opacity-80">
                {awayTeam.formation || '4-3-3'}
              </p>
            </div>
            <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-white/50">
              {awayFlagUrl && !flagErrors.away ? (
                <AvatarImage 
                  src={awayFlagUrl} 
                  alt={`${awayTeam.name} flag`}
                  className="object-cover"
                  onError={() => handleFlagError('away')}
                />
              ) : (
                <AvatarFallback className="bg-white/20 text-white">
                  <Flag className="h-5 w-5 sm:h-6 sm:w-6" />
                </AvatarFallback>
              )}
            </Avatar>
          </div>
        </div>
        
        {/* Mobile Match Name */}
        {name && (
          <h1 className="text-center text-md font-semibold truncate sm:hidden mt-2" title={name}>
            {name}
          </h1>
        )}
      </CardContent>
    </Card>
  );
};

export default MatchHeader;