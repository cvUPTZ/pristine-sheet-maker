
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Save, Settings } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface TeamHeaderData {
  name: string;
  formation?: string;
  score?: number;
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

const MatchHeader: React.FC<MatchHeaderProps> = ({
  mode,
  setMode,
  homeTeam,
  awayTeam,
  handleToggleTracking,
  handleSave,
  name,
  status,
  userRole,
  onToggleTracking,
  onSave
}) => {
  const [togglePressed, setTogglePressed] = useState(false);
  const [savePressed, setSavePressed] = useState(false);
  const isMobile = useIsMobile();

  const toggleHandler = onToggleTracking || handleToggleTracking;
  const saveHandler = onSave || handleSave;

  const handleToggleClick = () => {
    setTogglePressed(true);
    toggleHandler();
  };

  const handleSaveClick = () => {
    setSavePressed(true);
    saveHandler();
  };

  const truncateName = (name: string, maxLength: number) => {
    return name.length > maxLength ? name.substring(0, maxLength) + '...' : name;
  };

  return (
    <Card className="mb-2 sm:mb-4">
      <CardContent className="p-2 sm:p-4">
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* Main title and status */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                <h1 className="text-sm sm:text-xl md:text-2xl font-bold truncate">
                  {name || `${truncateName(homeTeam.name, isMobile ? 8 : 15)} vs ${truncateName(awayTeam.name, isMobile ? 8 : 15)}`}
                </h1>
                {status && (
                  <Badge variant={status === 'live' ? 'default' : 'secondary'} className="text-xs">
                    {status.toUpperCase()}
                  </Badge>
                )}
              </div>
              
              {/* Team details - responsive layout */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-gray-600">
                <div className="flex items-center justify-between sm:justify-start gap-2">
                  <span className="truncate max-w-[100px] sm:max-w-none">
                    {truncateName(homeTeam.name, isMobile ? 12 : 20)} ({homeTeam.formation || '4-4-2'})
                  </span>
                  <span className="text-gray-400">vs</span>
                  <span className="truncate max-w-[100px] sm:max-w-none">
                    {truncateName(awayTeam.name, isMobile ? 12 : 20)} ({awayTeam.formation || '4-3-3'})
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Action buttons - responsive grid */}
          <div className="grid grid-cols-2 sm:flex gap-1 sm:gap-2">
            <Button
              variant={mode === 'piano' ? 'default' : 'outline'}
              size={isMobile ? "sm" : "default"}
              onClick={() => setMode('piano')}
              className="text-xs sm:text-sm flex-1 sm:flex-none"
            >
              {isMobile ? 'Piano' : 'Piano Mode'}
            </Button>
            
            <Button
              variant={mode === 'tracking' ? 'default' : 'outline'}
              size={isMobile ? "sm" : "default"}
              onClick={() => setMode('tracking')}
              className="text-xs sm:text-sm flex-1 sm:flex-none"
            >
              {isMobile ? 'Track' : 'Tracking Mode'}
            </Button>
            
            <Button
              variant="secondary"
              size={isMobile ? "sm" : "default"}
              onClick={handleToggleClick}
              className="text-xs sm:text-sm flex-1 sm:flex-none"
            >
              <Play className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              {isMobile ? 'Start' : 'Toggle'}
            </Button>
            
            <Button
              variant="secondary"
              size={isMobile ? "sm" : "default"}
              onClick={handleSaveClick}
              className="text-xs sm:text-sm flex-1 sm:flex-none"
            >
              <Save className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              {isMobile ? 'Save' : 'Save'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MatchHeader;
