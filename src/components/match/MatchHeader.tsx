
import React from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save, MenuIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useBreakpoint } from '@/hooks/use-mobile';

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
  const isSmall = useBreakpoint('sm');
  const isMedium = useBreakpoint('md');
  const isXS = useBreakpoint('xs');
  
  return (
    <header className="mb-2 sm:mb-4 bg-white p-2 sm:p-3 md:p-4 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        {/* Mobile Menu */}
        <div className="lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size={isXS ? "sm" : "default"} className="h-8 w-8 sm:h-9 sm:w-9 p-0">
                <MenuIcon className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] sm:w-[300px]">
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
          <Button variant="outline" asChild size={isMedium ? "sm" : "default"}>
            <Link to="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden xl:inline">Dashboard</span>
            </Link>
          </Button>
        </div>
        
        <h1 className={cn(
          "text-sm sm:text-lg md:text-xl lg:text-2xl font-bold bg-gradient-to-r from-football-home to-football-away bg-clip-text text-transparent",
          "text-center flex-grow mx-2 sm:mx-4"
        )}>
          EFOOTPAD
        </h1>
        
        <div className="hidden lg:block">
          <Button 
            variant="outline"
            onClick={handleSave}
            className="flex items-center gap-2"
            size={isMedium ? "sm" : "default"}
          >
            <Save className="h-4 w-4" />
            <span className="hidden xl:inline">Save</span>
          </Button>
        </div>
        
        {/* Save button for mobile - icon only */}
        <div className="lg:hidden">
          <Button 
            variant="outline"
            onClick={handleSave}
            size={isXS ? "sm" : "default"}
            className="h-8 w-8 sm:h-9 sm:w-9 p-0"
          >
            <Save className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>
      </div>
      
      <div className="flex justify-center my-2 sm:my-3">
        <Tabs 
          value={mode} 
          className="w-full max-w-xs sm:max-w-sm md:max-w-md"
          onValueChange={(value) => setMode(value as 'piano' | 'tracking')}
        >
          <TabsList className="grid w-full grid-cols-2 h-8 sm:h-9 md:h-10">
            <TabsTrigger value="piano" className="text-xs sm:text-sm py-1 sm:py-2">Piano</TabsTrigger>
            <TabsTrigger value="tracking" onClick={handleToggleTracking} className="text-xs sm:text-sm py-1 sm:py-2">Tracking</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <div className="flex justify-between items-center mt-2 sm:mt-3 text-xs sm:text-sm md:text-base">
        <div className={cn(
          "text-football-home font-semibold flex-1 text-left",
          "text-xs sm:text-sm md:text-lg lg:text-xl"
        )}>
          <div className="truncate pr-1 sm:pr-2">
            {homeTeam.name}
          </div>
          {!isXS && (
            <div className="text-[0.6rem] sm:text-xs md:text-sm text-gray-600">
              {homeTeam.formation}
            </div>
          )}
        </div>
        
        <div className="text-center px-2 sm:px-4 flex-shrink-0">
          <div className="text-sm sm:text-base md:text-lg font-mono font-bold">
            vs
          </div>
        </div>
        
        <div className={cn(
          "text-football-away font-semibold flex-1 text-right",
          "text-xs sm:text-sm md:text-lg lg:text-xl"
        )}>
          <div className="truncate pl-1 sm:pl-2">
            {awayTeam.name}
          </div>
          {!isXS && (
            <div className="text-[0.6rem] sm:text-xs md:text-sm text-gray-600">
              {awayTeam.formation}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default MatchHeader;
