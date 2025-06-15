import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Flag } from 'lucide-react';

interface TeamHeaderData {
  name: string;
  formation?: string;
  score?: number;
  flagUrl?: string | null;
}
interface MatchHeaderProps {
  mode: 'piano' | 'tracking';
  setMode: (mode: 'piano' | 'tracking') => void;
  homeTeam: TeamHeaderData;
  awayTeam: TeamHeaderData;
  handleToggleTracking: () => void;
  handleSave: () => void;
  name?: string;
  status?: string;
  userRole?: string | null;
  onToggleTracking?: () => void;
  onSave?: () => void;
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
}) => {
  console.log("MatchHeader props:", { homeTeam, awayTeam });
  const homeColor = generateColorFromString(homeTeam.name);
  const awayColor = generateColorFromString(awayTeam.name);

  const gradientStyle = {
    background: `linear-gradient(90deg, ${homeColor} 0%, ${awayColor} 100%)`,
  };

  return (
    <Card style={gradientStyle} className="mb-4 text-white shadow-lg overflow-hidden relative border-none">
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />
      <CardContent className="relative p-4 sm:p-5">
        <div className="flex justify-between items-center">
          <div className="flex flex-1 items-center gap-3 sm:gap-4 text-left">
            <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-white/50">
              <AvatarImage 
                src={homeTeam.flagUrl || ''} 
                alt={`${homeTeam.name} flag`}
                className="object-cover"
              />
              <AvatarFallback className="bg-white/20 text-white">
                <Flag className="h-5 w-5 sm:h-6 sm:w-6" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg sm:text-2xl font-bold truncate" title={homeTeam.name}>{homeTeam.name}</h2>
              <p className="text-xs sm:text-sm opacity-80">{homeTeam.formation || '4-4-2'}</p>
            </div>
          </div>

          <div className="flex-1 text-center px-2">
            <h1 className="text-sm sm:text-lg font-semibold truncate hidden sm:block" title={name}>
              {name || 'Match'}
            </h1>
            {status && (
              <Badge
                variant="secondary"
                className="mt-1 bg-white/20 text-white border-none text-xs backdrop-blur-sm"
              >
                {status.toUpperCase()}
              </Badge>
            )}
          </div>

          <div className="flex flex-1 items-center gap-3 sm:gap-4 text-right justify-end">
            <div>
              <h2 className="text-lg sm:text-2xl font-bold truncate" title={awayTeam.name}>{awayTeam.name}</h2>
              <p className="text-xs sm:text-sm opacity-80">{awayTeam.formation || '4-3-3'}</p>
            </div>
            <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-white/50">
              <AvatarImage 
                src={awayTeam.flagUrl || ''} 
                alt={`${awayTeam.name} flag`}
                className="object-cover"
              />
              <AvatarFallback className="bg-white/20 text-white">
                <Flag className="h-5 w-5 sm:h-6 sm:w-6" />
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
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
