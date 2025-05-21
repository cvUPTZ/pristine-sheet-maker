
import React from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save, MenuIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

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
    <header className="mb-4 bg-white p-2 md:p-4 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-2">
        {/* Mobile Menu */}
        <div className="lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <MenuIcon className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[250px]">
              <div className="flex flex-col gap-4 mt-10">
                <Button variant="outline" asChild className="justify-start">
                  <Link to="/" className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Dashboard
                  </Link>
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleSave}
                  className="flex items-center gap-2 justify-start"
                >
                  <Save className="h-4 w-4" />
                  Save Match
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
        
        {/* Regular Buttons for Desktop */}
        <div className="hidden lg:block">
          <Button variant="outline" asChild>
            <Link to="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
          </Button>
        </div>
        
        <h1 className={cn(
          "text-xl md:text-2xl font-bold bg-gradient-to-r from-football-home to-football-away bg-clip-text text-transparent",
          "sm:text-center flex-grow text-center"
        )}>
          EFOOTPAD
        </h1>
        
        <div className="hidden lg:block">
          <Button 
            variant="outline"
            onClick={handleSave}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Save Match
          </Button>
        </div>
        
        {/* Empty div for proper layout on mobile */}
        <div className="lg:hidden w-[40px]"></div>
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
      
      <div className="flex justify-between items-center mt-2 text-sm md:text-base flex-wrap">
        <div className="text-football-home font-semibold md:text-xl">
          {homeTeam.name} <span className="text-xs md:text-sm">({homeTeam.formation})</span>
        </div>
        <div className="text-lg font-mono font-bold mx-1 md:mx-4">
          vs
        </div>
        <div className="text-football-away font-semibold md:text-xl">
          {awayTeam.name} <span className="text-xs md:text-sm">({awayTeam.formation})</span>
        </div>
      </div>
    </header>
  );
};

export default MatchHeader;
