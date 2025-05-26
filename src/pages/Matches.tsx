import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Match } from '@/types'; // Assuming Match type is correctly defined here
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Matches: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMatches = async () => {
    setIsLoading(true); // Set loading true at the beginning of the fetch attempt
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error fetching matches:', error);
        throw error; // Re-throw to be caught by the component's catch block
      }

      // Handle cases where data might be null (e.g., no matches found) or not an array
      if (!data || !Array.isArray(data)) {
        setMatches([]); // Set to empty array if no data or data is not an array
        return; 
      }

      // Process the data:
      // 1. Filter out any items that are null, not objects, or don't have a valid 'id'.
      // 2. Map the valid items to the structure expected by your Match type and UI.
      const processedMatches = data
        .filter(item => {
          if (item === null || typeof item !== 'object') {
            console.warn('Skipping invalid item from Supabase (null or not an object):', item);
            return false;
          }
          if (typeof item.id === 'undefined' || item.id === null || String(item.id).trim() === '') {
            console.warn('Skipping item from Supabase due to missing or invalid id:', item);
            return false;
          }
          return true;
        })
        .map(dbMatch => {
          // We are now sure dbMatch is an object and dbMatch.id is valid
          return {
            ...dbMatch, // Spread all properties from the database record
            id: String(dbMatch.id), // Ensure id is a string (good for keys)
            home_team_name: dbMatch.home_team_name || 'N/A', // Default if missing
            away_team_name: dbMatch.away_team_name || 'N/A', // Default if missing
            match_date: dbMatch.match_date, // Keep as is (can be null/undefined if optional)
            // Ensure status is one of the allowed types for your Match interface
            // If dbMatch.status can be anything, you might need more sophisticated mapping or a default
            status: (dbMatch.status || 'draft') as 'published' | 'draft' | 'live' | 'completed' | 'archived', 
          };
        });
      
      // Assuming your Match type aligns with the object structure created above
      setMatches(processedMatches as Match[]);

    } catch (error: any) {
      // Catch errors from Supabase call or from processing logic
      console.error('Error in fetchMatches process:', error.message);
      setMatches([]); // Set to empty array on any error to prevent rendering issues
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  if (isLoading) {
    return <div className="container mx-auto p-6 text-center">Loading matches...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Matches</h1>
        {/* Optional: Add a button to refresh or create new matches */}
        {/* <Button onClick={fetchMatches}>Refresh Matches</Button> */}
      </div>
      
      {matches.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">No matches found or available.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matches.map((match) => (
            // `match` here is guaranteed by the processing in fetchMatches
            // to be an object with a valid, stringified `id`.
            <Card key={match.id}>
              <CardHeader>
                <CardTitle>{match.home_team_name} vs {match.away_team_name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Date: {match.match_date ? new Date(match.match_date).toLocaleDateString() : 'Not specified'}
                  </p>
                  {/* Ensure match.status has a value; if it can be undefined, handle that for Badge */}
                  <Badge variant={match.status === 'live' ? 'destructive' : (match.status === 'completed' ? 'default' : 'outline')}>
                    {match.status || 'Unknown Status'}
                  </Badge>
                  <div className="pt-2"> {/* Added some padding for the button */}
                    <Link to={`/match/${match.id}`}>
                      <Button variant="default" size="sm">View Match</Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Matches;
