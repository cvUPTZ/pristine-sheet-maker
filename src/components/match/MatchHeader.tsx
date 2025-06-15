
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

type MatchStatus = 'live' | 'draft' | 'scheduled' | 'completed';

interface MatchHeaderProps {
  homeTeam: TeamHeaderData;
  awayTeam: TeamHeaderData;
  name?: string;
  status?: MatchStatus;
  matchId?: string;
  mode?: string;
  setMode?: (mode: any) => void;
  handleToggleTracking?: () => void;
  handleSave?: () => void;
}

// Design system color palette for team logos
const DESIGN_COLORS = [
  { primary: '#2563eb', secondary: '#3b82f6', accent: '#60a5fa' }, // Blue
  { primary: '#dc2626', secondary: '#ef4444', accent: '#f87171' }, // Red
  { primary: '#059669', secondary: '#10b981', accent: '#34d399' }, // Green
  { primary: '#7c3aed', secondary: '#8b5cf6', accent: '#a78bfa' }, // Purple
  { primary: '#ea580c', secondary: '#f97316', accent: '#fb923c' }, // Orange
  { primary: '#0891b2', secondary: '#06b6d4', accent: '#22d3ee' }, // Cyan
  { primary: '#be123c', secondary: '#e11d48', accent: '#f43f5e' }, // Rose
  { primary: '#4338ca', secondary: '#6366f1', accent: '#818cf8' }, // Indigo
];

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

// Helper function to get design system colors for a team
const getTeamColors = (teamName: string) => {
  if (!teamName) return DESIGN_COLORS[0];
  let hash = 0;
  for (let i = 0; i < teamName.length; i++) {
    hash = teamName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return DESIGN_COLORS[Math.abs(hash) % DESIGN_COLORS.length];
};

// Component to render unique team SVG logo with design system approach
const TeamLogo: React.FC<{ teamName: string; size?: number }> = ({ teamName, size = 48 }) => {
  const colors = getTeamColors(teamName);
  const initials = teamName
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Generate pattern based on team name hash
  const pattern = Math.abs(teamName.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % 4;

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className="rounded-full shadow-sm">
      <defs>
        <linearGradient id={`grad-${teamName.replace(/\s+/g, '')}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.primary} />
          <stop offset="50%" stopColor={colors.secondary} />
          <stop offset="100%" stopColor={colors.accent} />
        </linearGradient>
        <filter id={`shadow-${teamName.replace(/\s+/g, '')}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.1"/>
        </filter>
      </defs>
      
      {/* Background circle with gradient */}
      <circle 
        cx="24" 
        cy="24" 
        r="23" 
        fill={`url(#grad-${teamName.replace(/\s+/g, '')})`}
        filter={`url(#shadow-${teamName.replace(/\s+/g, '')})`}
      />
      
      {/* Inner border */}
      <circle 
        cx="24" 
        cy="24" 
        r="20" 
        fill="none" 
        stroke="rgba(255,255,255,0.2)" 
        strokeWidth="1"
      />
      
      {/* Pattern overlay based on team name */}
      {pattern === 0 && (
        <g opacity="0.15">
          <circle cx="24" cy="24" r="16" fill="none" stroke="white" strokeWidth="1.5" />
          <circle cx="24" cy="24" r="10" fill="none" stroke="white" strokeWidth="1" />
        </g>
      )}
      
      {pattern === 1 && (
        <g opacity="0.15">
          <polygon 
            points="24,10 32,18 32,30 24,38 16,30 16,18" 
            fill="none" 
            stroke="white" 
            strokeWidth="1.5"
          />
        </g>
      )}
      
      {pattern === 2 && (
        <g opacity="0.15">
          <rect 
            x="14" 
            y="14" 
            width="20" 
            height="20" 
            rx="3" 
            fill="none" 
            stroke="white" 
            strokeWidth="1.5"
          />
        </g>
      )}
      
      {pattern === 3 && (
        <g opacity="0.15">
          <path 
            d="M24 12 L32 20 L32 28 L24 36 L16 28 L16 20 Z" 
            fill="none" 
            stroke="white" 
            strokeWidth="1.5"
          />
        </g>
      )}
      
      {/* Team initials with better typography */}
      <text 
        x="24" 
        y="24" 
        textAnchor="middle" 
        dominantBaseline="central" 
        fill="white" 
        fontSize="13" 
        fontWeight="600" 
        fontFamily="system-ui, -apple-system, sans-serif"
        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
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
  mode,
  setMode,
  handleToggleTracking,
  handleSave,
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
      case 'completed':
        return 'bg-gray-500/80 text-white';
      case 'scheduled':
        return 'bg-blue-500/80 text-white';
      case 'draft':
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
            <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-white/30 shadow-lg">
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
            <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-white/30 shadow-lg">
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
