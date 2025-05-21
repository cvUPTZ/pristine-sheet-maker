
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import TeamSetupWithFormation from '@/components/TeamSetupWithFormation';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Team } from '@/types';

interface SetupScreenProps {
  homeTeam: Team;
  awayTeam: Team;
  updateTeams: (teams: { home: Team; away: Team }) => void;
  completeSetup: () => void;
}

const SetupScreen: React.FC<SetupScreenProps> = ({
  homeTeam,
  awayTeam,
  updateTeams,
  completeSetup
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Button variant="outline" asChild>
            <Link to="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-center">New Match Setup</h1>
          <div className="w-[100px]"></div>
        </div>
        
        <Card className="bg-white rounded-lg shadow-lg overflow-hidden">
          <TeamSetupWithFormation 
            teams={{ home: homeTeam, away: awayTeam }}
            onTeamsChange={updateTeams}
            onConfirm={completeSetup}
          />
        </Card>
      </div>
    </div>
  );
};

export default SetupScreen;
