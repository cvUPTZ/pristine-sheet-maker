
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import TeamSetupWithFormation from '@/components/TeamSetupWithFormation';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Team } from '@/types';
import { toast } from 'sonner';

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
  const handleStartMatch = () => {
    // Validation check before starting the match
    if (homeTeam.players.length < 1 || awayTeam.players.length < 1) {
      toast.error("Each team must have at least one player.");
      return;
    }
    
    if (!homeTeam.formation || !awayTeam.formation) {
      toast.error("Please select a formation for both teams.");
      return;
    }
    
    // All validation passed
    completeSetup();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-2 md:p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Button variant="outline" asChild className="text-xs md:text-sm">
            <Link to="/" className="flex items-center gap-1 md:gap-2">
              <ArrowLeft className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Back to</span> Dashboard
            </Link>
          </Button>
          <h1 className="text-xl md:text-2xl font-bold text-center">New Match Setup</h1>
          <div className="w-[40px] md:w-[100px]"></div>
        </div>
        
        <Card className="bg-white rounded-lg shadow-lg overflow-hidden">
          <TeamSetupWithFormation 
            teams={{ home: homeTeam, away: awayTeam }}
            onTeamsChange={updateTeams}
            onConfirm={handleStartMatch}
          />
        </Card>
      </div>
    </div>
  );
};

export default SetupScreen;
