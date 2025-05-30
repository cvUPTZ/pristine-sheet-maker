
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, Search } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Match, Filter, Statistics, BallTrackingPoint } from '@/types';
import { DateRange } from 'react-day-picker';

const Matches: React.FC = () => {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>({
    searchTerm: '',
    dateRange: { from: undefined, to: undefined }
  });

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const processedMatches: Match[] = (data || []).map(match => ({
        ...match,
        name: match.name || undefined,
        matchDate: match.match_date || undefined,
        homeTeamName: match.home_team_name,
        awayTeamName: match.away_team_name,
        venue: match.location || undefined,
        statistics: {
          possession: { home: 0, away: 0 },
          shots: { home: 0, away: 0 },
          corners: { home: 0, away: 0 },
          fouls: { home: 0, away: 0 },
          offsides: { home: 0, away: 0 },
          passes: { home: 0, away: 0 },
          ballsPlayed: { home: 0, away: 0 },
          ballsLost: { home: 0, away: 0 },
          duels: { home: 0, away: 0 },
          crosses: { home: 0, away: 0 }
        } as Statistics,
        ballTrackingData: [] as BallTrackingPoint[]
      }));

      setMatches(processedMatches);
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setFilter(prev => ({
      ...prev,
      dateRange: {
        from: range?.from,
        to: range?.to
      }
    }));
  };

  const filteredMatches = matches.filter(match => {
    const matchesSearch = !filter.searchTerm || 
      match.home_team_name.toLowerCase().includes(filter.searchTerm.toLowerCase()) ||
      match.away_team_name.toLowerCase().includes(filter.searchTerm.toLowerCase());

    const matchesDateRange = !filter.dateRange.from || !filter.dateRange.to || !match.match_date ||
      (new Date(match.match_date) >= filter.dateRange.from && 
       new Date(match.match_date) <= filter.dateRange.to);

    return matchesSearch && matchesDateRange;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'bg-green-500';
      case 'completed': return 'bg-blue-500';
      case 'scheduled': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center">Loading matches...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Matches</h1>
        <Button onClick={() => navigate('/create-match')}>
          <Plus className="w-4 h-4 mr-2" />
          Create Match
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filter Matches</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search teams..."
                  value={filter.searchTerm}
                  onChange={(e) => setFilter(prev => ({ ...prev, searchTerm: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !filter.dateRange.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filter.dateRange.from ? (
                    filter.dateRange.to ? (
                      <>
                        {format(filter.dateRange.from, "LLL dd, y")} -{" "}
                        {format(filter.dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(filter.dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={filter.dateRange.from}
                  selected={filter.dateRange}
                  onSelect={handleDateRangeChange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Matches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMatches.map((match) => (
          <Card key={match.id} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">
                  {match.home_team_name} vs {match.away_team_name}
                </CardTitle>
                <Badge className={getStatusColor(match.status)}>
                  {match.status}
                </Badge>
              </div>
              <CardDescription>
                {match.match_date ? format(new Date(match.match_date), 'PPP') : 'Date TBD'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {match.location && (
                  <p className="text-sm text-gray-600">📍 {match.location}</p>
                )}
                <div className="flex justify-between items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/match/${match.id}`)}
                  >
                    View Details
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate(`/match-analysis-v2/${match.id}`)}
                  >
                    Analyze
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredMatches.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">No matches found matching your criteria.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Matches;
