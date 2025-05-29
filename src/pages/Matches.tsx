
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/integrations/supabase/client';
import { Match, Statistics, BallTrackingPoint } from '@/types/index';

interface Filter {
  searchTerm: string;
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
}

const Matches = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [filter, setFilter] = useState<Filter>({
    searchTerm: '',
    dateRange: { from: undefined, to: undefined },
  });
  const navigate = useNavigate();

  const { data: matchesData, isLoading, isError, error } = useQuery({
    queryKey: ['matches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data;
    }
  });

  useEffect(() => {
    if (matchesData) {
      const processedData = processMatchData(matchesData);
      setMatches(processedData);
    }
  }, [matchesData]);

  const processMatchData = (matches: any[]): Match[] => {
    return matches.map(match => ({
      id: match.id,
      name: match.name || undefined,
      homeTeamName: match.home_team_name,
      awayTeamName: match.away_team_name,
      status: match.status,
      matchDate: match.match_date || new Date().toISOString(),
      statistics: (match.match_statistics || {}) as Statistics,
      ballTrackingData: (match.ball_tracking_data || []) as BallTrackingPoint[],
      home_team_name: match.home_team_name,
      away_team_name: match.away_team_name,
      home_team_players: match.home_team_players || [],
      away_team_players: match.away_team_players || [],
    }));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(prev => ({ ...prev, searchTerm: e.target.value }));
  };

  const handleDateChange = (date: { from?: Date, to?: Date }) => {
    setFilter(prev => ({ ...prev, dateRange: date }));
  };

  const filteredMatches = React.useMemo(() => {
    return matches.filter(match => {
      const searchTerm = filter.searchTerm.toLowerCase();
      const nameMatch = match.name?.toLowerCase().includes(searchTerm) ||
        match.homeTeamName.toLowerCase().includes(searchTerm) ||
        match.awayTeamName.toLowerCase().includes(searchTerm);

      const dateRange = filter.dateRange;
      let dateMatch = true;

      if (dateRange.from && dateRange.to && match.matchDate) {
        const matchDate = new Date(match.matchDate);
        dateMatch = matchDate >= dateRange.from && matchDate <= dateRange.to;
      } else if (dateRange.from && match.matchDate) {
        const matchDate = new Date(match.matchDate);
        dateMatch = matchDate >= dateRange.from;
      } else if (dateRange.to && match.matchDate) {
        const matchDate = new Date(match.matchDate);
        dateMatch = matchDate <= dateRange.to;
      }

      return nameMatch && dateMatch;
    });
  }, [matches, filter]);

  const processedMatches = React.useMemo(() => {
    return filteredMatches.map(match => ({
      ...match,
      matchDate: match.matchDate ? new Date(match.matchDate).toLocaleDateString() : 'No date',
    }));
  }, [filteredMatches]);

  if (isLoading) {
    return <div>Loading matches...</div>;
  }

  if (isError) {
    return <div>Error fetching matches: {error?.message}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 md:space-x-4">
        <div className="w-full md:w-1/2">
          <Label htmlFor="search">Search Matches</Label>
          <Input
            type="search"
            id="search"
            placeholder="Search by match name, home team, or away team..."
            onChange={handleSearchChange}
          />
        </div>

        <div className="w-full md:w-1/2">
          <Label>Filter by Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !filter.dateRange.from || !filter.dateRange.to
                    ? "text-muted-foreground"
                    : ""
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filter.dateRange.from && filter.dateRange.to ? (
                  `${format(filter.dateRange.from, "PPP")} - ${format(filter.dateRange.to, "PPP")}`
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                defaultMonth={filter.dateRange.from}
                selected={filter.dateRange}
                onSelect={handleDateChange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <Separator />

      {processedMatches.map((match) => (
        <Card key={match.id}>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold">{match.name || 'Unnamed Match'}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {match.homeTeamName} vs {match.awayTeamName}
                </p>
                <p className="text-xs text-gray-400">
                  {match.matchDate ? new Date(match.matchDate).toLocaleDateString() : 'No date'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {processedMatches.length === 0 && (
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-gray-500">No matches found.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Matches;
