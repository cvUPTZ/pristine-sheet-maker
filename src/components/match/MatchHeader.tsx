
import React from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save } from 'lucide-react';
import { Link } from 'react-router-dom';

interface MatchHeaderProps {
  mode: 'piano' | 'tracking';
  setMode: (mode: 'piano' | 'tracking') => void;
  homeTeam: { name: string; formation: string };
  awayTeam: { name: string; formation: string };
  handleToggleTracking: () => void;
  handleSave: () => void;
}

const MatchHeader: React.FC<MatchHeaderProps> = ({
  mode,
  setMode,
  homeTeam,
  awayTeam,
  handleToggleTracking,
  handleSave
}) => {
  return (
    <header className="mb-4 bg-white p-4 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-2">
        <Button variant="outline" asChild>
          <Link to="/" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-center bg-gradient-to-r from-football-home to-football-away bg-clip-text text-transparent">EFOOTPAD</h1>
        <Button 
          variant="outline"
          onClick={handleSave}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          Save Match
        </Button>
      </div>
      
      <div className="flex justify-center my-2">
        <Tabs 
          value={mode} 
          className="w-full max-w-md"
          onValueChange={(value) => setMode(value as 'piano' | 'tracking')}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="piano">Piano Mode</TabsTrigger>
            <TabsTrigger value="tracking" onClick={handleToggleTracking}>Ball Tracking</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <div className="flex justify-between items-center mt-2">
        <div className="text-xl font-semibold text-football-home">
          {homeTeam.name} ({homeTeam.formation})
        </div>
        <div className="text-lg font-mono font-bold">
          vs
        </div>
        <div className="text-xl font-semibold text-football-away">
          {awayTeam.name} ({awayTeam.formation})
        </div>
      </div>
    </header>
  );
};

export default MatchHeader;
