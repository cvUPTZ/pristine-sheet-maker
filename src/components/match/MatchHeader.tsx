
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Save } from 'lucide-react';

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

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-xl sm:text-2xl font-bold">
                {name || `${homeTeam.name} vs ${awayTeam.name}`}
              </h1>
              {status && (
                <Badge variant={status === 'live' ? 'default' : 'secondary'}>
                  {status.toUpperCase()}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>{homeTeam.name} ({homeTeam.formation || '4-4-2'})</span>
              <span>vs</span>
              <span>{awayTeam.name} ({awayTeam.formation || '4-3-3'})</span>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => setMode('piano')}
            >
              Piano Mode
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setMode('tracking')}
            >
              Tracking Mode
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleToggleClick}
            >
              <Play className="w-4 h-4 mr-1" />
              Toggle
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSaveClick}
            >
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MatchHeader;
