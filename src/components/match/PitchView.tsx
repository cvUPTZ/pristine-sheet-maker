
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import FootballPitch from '@/components/FootballPitch';
import { Team, BallTrackingPoint } from '@/types';

interface PitchViewProps {
  homeTeam: Team;
  awayTeam: Team;
  ballTrackingData: BallTrackingPoint[];
  onCoordinateClick: (x: number, y: number) => void;
}

const PitchView: React.FC<PitchViewProps> = ({
  homeTeam,
  awayTeam,
  ballTrackingData,
  onCoordinateClick
}) => {
  const [selectedTeam, setSelectedTeam] = useState<'home' | 'away'>('home');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Football Pitch</CardTitle>
          <div className="flex gap-2">
            <Button
              variant={selectedTeam === 'home' ? 'default' : 'outline'}
              onClick={() => setSelectedTeam('home')}
              size="sm"
            >
              {homeTeam.name}
            </Button>
            <Button
              variant={selectedTeam === 'away' ? 'default' : 'outline'}
              onClick={() => setSelectedTeam('away')}
              size="sm"
            >
              {awayTeam.name}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full h-96 border rounded-lg bg-green-100 relative overflow-hidden">
            <FootballPitch
              players={selectedTeam === 'home' ? homeTeam.players : awayTeam.players}
              ballTrackingPoints={ballTrackingData}
              onCoordinateClick={onCoordinateClick}
              teamColor={selectedTeam === 'home' ? 'blue' : 'red'}
            />
          </div>
        </CardContent>
      </Card>

      {/* Ball tracking points display */}
      {ballTrackingData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ball Tracking Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600">
              Total tracking points: {ballTrackingData.length}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PitchView;
