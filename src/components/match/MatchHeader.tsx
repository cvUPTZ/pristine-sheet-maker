
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

// Helper function to generate a team logo color
const generateTeamColor = (teamName: string): string => {
  if (!teamName) return '#3b82f6';
  let hash = 0;
  for (let i = 0; i < teamName.length; i++) {
    hash = teamName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = hash % 360;
  return `hsl(${h}, 70%, 50%)`;
};

// Helper function to generate a secondary color
const generateSecondaryColor = (teamName: string): string => {
  if (!teamName) return '#1d4ed8';
  let hash = 0;
  for (let i = 0; i < teamName.length; i++) {
    hash = teamName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = (hash % 360 + 180) % 360; // Offset by 180 degrees for contrast
  return `hsl(${h}, 60%, 40%)`;
};

// Component to render unique team SVG logo
const TeamLogo: React.FC<{ teamName: string; size?: number }> = ({ teamName, size = 48 }) => {
  const primaryColor = generateTeamColor(teamName);
  const secondaryColor = generateSecondaryColor(teamName);
  const initials = teamName
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Generate pattern based on team name
  const pattern = teamName.length % 4;

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className="rounded-full">
      <defs>
        <linearGradient id={`grad-${teamName}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={primaryColor} />
          <stop offset="100%" stopColor={secondaryColor} />
        </linearGradient>
      </defs>
      
      {/* Background circle */}
      <circle cx="24" cy="24" r="24" fill={`url(#grad-${teamName})`} />
      
      {/* Pattern overlay based on team name */}
      {pattern === 0 && (
        <>
          <circle cx="24" cy="24" r="18" fill="none" stroke="white" strokeWidth="2" opacity="0.3" />
          <circle cx="24" cy="24" r="12" fill="none" stroke="white" strokeWidth="1.5" opacity="0.4" />
        </>
      )}
      
      {pattern === 1 && (
        <>
          <polygon points="24,8 35,20 35,28 24,40 13,28 13,20" fill="white" opacity="0.2" />
          <polygon points="24,12 31,20 31,26 24,36 17,26 17,20" fill="white" opacity="0.1" />
        </>
      )}
      
      {pattern === 2 && (
        <>
          <rect x="12" y="12" width="24" height="24" rx="4" fill="white" opacity="0.2" />
          <rect x="16" y="16" width="16" height="16" rx="2" fill="white" opacity="0.1" />
        </>
      )}
      
      {pattern === 3 && (
        <>
          <path d="M24 8 L36 24 L24 40 L12 24 Z" fill="white" opacity="0.2" />
          <path d="M24 12 L32 24 L24 36 L16 24 Z" fill="white" opacity="0.1" />
        </>
      )}
      
      {/* Team initials */}
      <text 
        x="24" 
        y="24" 
        textAnchor="middle" 
        dominantBaseline="central" 
        fill="white" 
        fontSize="14" 
        fontWeight="bold" 
        fontFamily="system-ui, sans-serif"
      >
        {initials}
      </text>
    </svg>
  );
};

const MatchHeader: React.FC<MatchHeaderProps> = ({
  homeTeam,
  awayTeam,
  name,
  status,
  matchId,
}) => {
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
              {homeFlagUrl ? (
                <AvatarImage 
                  src={homeFlagUrl} 
                  alt={`${homeTeam.name} flag`}
                  className="object-cover"
                />
              ) : (
                <AvatarFallback className="bg-transparent p-0 border-none">
                  <TeamLogo teamName={homeTeam.name} size={48} />
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
              {awayFlagUrl ? (
                <AvatarImage 
                  src={awayFlagUrl} 
                  alt={`${awayTeam.name} flag`}
                  className="object-cover"
                />
              ) : (
                <AvatarFallback className="bg-transparent p-0 border-none">
                  <TeamLogo teamName={awayTeam.name} size={48} />
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
