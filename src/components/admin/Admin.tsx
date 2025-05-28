"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Database } from "@/lib/database.types"; // Assuming this path is correct
import { useMemo } from "react";
import { RealTimeMatchEvents } from "./RealTimeMatchEvents"; // Import the new component
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Import Select components
import { Badge } from "@/components/ui/badge"; // Import Badge component

// Define interfaces for our data
interface Match {
  id:string;
  name?: string | null; // Added
  status?: string | null; // Added
  match_type?: string | null; // Added
  match_date: string;
  location: string;
  competition: string;
  home_team_name: string;
  away_team_name: string;
  home_team_score?: number | null;
  away_team_score?: number | null;
  notes?: string | null;
  created_at?: string;
}

interface MatchRosterPlayer {
  id: string;
  match_id: string;
  team_context: string; // 'home' or 'away'
  player_name: string;
  jersey_number: number;
  position: string;
  match_date?: string;
  competition?: string;
  team_name?: string;
}

// Interface for aggregated player stats
interface AggregatedPlayerStat {
  playerName: string;
  matchesPlayed: number;
  positions: string[]; // List of positions played
  teams: string[]; // List of teams played for
}

export default function AdminPage() {
  const supabase = createClientComponentClient<Database>();
  const [matches, setMatches] = useState<Match[]>([]);
  const [playerRosters, setPlayerRosters] = useState<MatchRosterPlayer[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [loadingRosters, setLoadingRosters] = useState(true);
  const [errorMatches, setErrorMatches] = useState<string | null>(null);
  const [errorRosters, setErrorRosters] = useState<string | null>(null);
  const [selectedMatchIdForFeed, setSelectedMatchIdForFeed] = useState<string | null>(null);

  // Memoized calculations for summary statistics
  const totalMatches = useMemo(() => matches.length, [matches]);

  const uniquePlayersCount = useMemo(() => {
    const playerNames = new Set(playerRosters.map(p => p.player_name));
    return playerNames.size;
  }, [playerRosters]);

  const aggregatedPlayerStats = useMemo(() => {
    const stats: Record<string, AggregatedPlayerStat> = {};
    playerRosters.forEach(player => {
      if (!stats[player.player_name]) {
        stats[player.player_name] = {
          playerName: player.player_name,
          matchesPlayed: 0,
          positions: [],
          teams: [],
        };
      }
      stats[player.player_name].matchesPlayed += 1;
      if (player.position && !stats[player.player_name].positions.includes(player.position)) {
        stats[player.player_name].positions.push(player.position);
      }
      if (player.team_name && !stats[player.player_name].teams.includes(player.team_name)) {
        stats[player.player_name].teams.push(player.team_name);
      }
    });
    return Object.values(stats).sort((a, b) => b.matchesPlayed - a.matchesPlayed);
  }, [playerRosters]);


  useEffect(() => {
    async function fetchMatches() {
      setLoadingMatches(true);
      setErrorMatches(null);
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .order("match_date", { ascending: false });

      if (error) {
        console.error("Error fetching matches:", error);
        setErrorMatches(error.message);
      } else {
        setMatches(data || []);
      }
      setLoadingMatches(false);
    }

    async function fetchPlayerRosters() {
      setLoadingRosters(true);
      setErrorRosters(null);
      // Fetching all rosters. For better context, we might later join with matches
      // or fetch match details separately if needed for each player.
      // For now, focusing on displaying raw data from match_rosters.
      const { data, error } = await supabase
        .from("match_rosters")
        .select(`
          id,
          match_id,
          team_context,
          player_name,
          jersey_number,
          position,
          matches ( match_date, competition, home_team_name, away_team_name )
        `)
        .order("player_name", { ascending: true });

      if (error) {
        console.error("Error fetching player rosters:", error);
        setErrorRosters(error.message);
      } else if (data) {
        // Process data to include match details directly in the player roster item
        const processedRosters = data.map((roster: any) => {
          const match = roster.matches;
          return {
            id: roster.id,
            match_id: roster.match_id,
            team_context: roster.team_context,
            player_name: roster.player_name,
            jersey_number: roster.jersey_number,
            position: roster.position,
            match_date: match?.match_date,
            competition: match?.competition,
            team_name: roster.team_context === 'home' ? match?.home_team_name : match?.away_team_name,
          };
        });
        setPlayerRosters(processedRosters);
      } else {
        setPlayerRosters([]);
      }
      setLoadingRosters(false);
    }

    fetchMatches();
    fetchPlayerRosters();
  }, [supabase]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      {/* Summary Statistics Section */}
      <section className="mb-8 p-4 border rounded-lg shadow-sm bg-gray-50">
        <h2 className="text-xl font-semibold mb-3 text-gray-700">Summary Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 bg-white rounded shadow">
            <h3 className="text-lg font-medium text-gray-600">Total Matches Played</h3>
            {loadingMatches ? <p>Loading...</p> : <p className="text-2xl font-bold text-blue-600">{totalMatches}</p>}
          </div>
          <div className="p-3 bg-white rounded shadow">
            <h3 className="text-lg font-medium text-gray-600">Total Unique Players</h3>
            {loadingRosters ? <p>Loading...</p> : <p className="text-2xl font-bold text-green-600">{uniquePlayersCount}</p>}
          </div>
        </div>
      </section>

      {/* Matches Section */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Matches List</h2>
        {loadingMatches && <p>Loading matches...</p>}
        {errorMatches && <p className="text-red-500">Error: {errorMatches}</p>}
        {!loadingMatches && !errorMatches && matches.length === 0 && <p>No matches found.</p>}
        {!loadingMatches && !errorMatches && matches.length > 0 && (
          <div className="overflow-x-auto shadow-md rounded-lg">
            <table className="min-w-full bg-white border border-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-3 px-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-600">Date</th>
                  <th className="py-3 px-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-600">Match Name</th>
                  <th className="py-3 px-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-600">Status</th>
                  <th className="py-3 px-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-600">Match Type</th>
                  <th className="py-3 px-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-600">Competition</th>
                  <th className="py-3 px-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-600">Location</th>
                  <th className="py-3 px-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-600">Home Team</th>
                  <th className="py-3 px-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-600">Away Team</th>
                  <th className="py-3 px-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-600">Score (H-A)</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((match, index) => (
                  <tr key={match.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="py-2 px-4 border-b border-gray-200">{new Date(match.match_date).toLocaleDateString()}</td>
                    <td className="py-2 px-4 border-b border-gray-200">{match.name || 'Unnamed Match'}</td>
                    <td className="py-2 px-4 border-b border-gray-200">
                      <Badge variant={
                        match.status === 'live' ? 'destructive' : 
                        match.status === 'completed' ? 'secondary' : 
                        match.status === 'upcoming' ? 'default' : // Assuming 'default' is suitable for upcoming
                        'outline' // Fallback for draft, postponed, cancelled
                      }>
                        {match.status || 'N/A'}
                      </Badge>
                    </td>
                    <td className="py-2 px-4 border-b border-gray-200">{match.match_type || 'N/A'}</td>
                    <td className="py-2 px-4 border-b border-gray-200">{match.competition}</td>
                    <td className="py-2 px-4 border-b border-gray-200">{match.location}</td>
                    <td className="py-2 px-4 border-b border-gray-200">{match.home_team_name}</td>
                    <td className="py-2 px-4 border-b border-gray-200">{match.away_team_name}</td>
                    <td className="py-2 px-4 border-b border-gray-200">
                      {match.home_team_score !== null && match.home_team_score !== undefined ? match.home_team_score : '-'}
                      {' - '}
                      {match.away_team_score !== null && match.away_team_score !== undefined ? match.away_team_score : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Aggregated Player Statistics Section */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Aggregated Player Statistics</h2>
        {loadingRosters && <p>Loading player statistics...</p>}
        {errorRosters && <p className="text-red-500">Error: {errorRosters}</p>}
        {!loadingRosters && !errorRosters && aggregatedPlayerStats.length === 0 && <p>No player statistics available.</p>}
        {!loadingRosters && !errorRosters && aggregatedPlayerStats.length > 0 && (
          <div className="overflow-x-auto shadow-md rounded-lg">
            <table className="min-w-full bg-white border border-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-3 px-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-600">Player Name</th>
                  <th className="py-3 px-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-600">Matches Played</th>
                  <th className="py-3 px-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-600">Positions Played</th>
                  <th className="py-3 px-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-600">Teams Played For</th>
                </tr>
              </thead>
              <tbody>
                {aggregatedPlayerStats.map((playerStat, index) => (
                  <tr key={playerStat.playerName + index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="py-2 px-4 border-b border-gray-200">{playerStat.playerName}</td>
                    <td className="py-2 px-4 border-b border-gray-200">{playerStat.matchesPlayed}</td>
                    <td className="py-2 px-4 border-b border-gray-200">{playerStat.positions.join(', ') || 'N/A'}</td>
                    <td className="py-2 px-4 border-b border-gray-200">{playerStat.teams.join(', ') || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      
      {/* Detailed Player Rosters per Match Section (Original Player Statistics) */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Player Appearances per Match</h2>
        {loadingRosters && <p>Loading player rosters...</p>}
        {errorRosters && <p className="text-red-500">Error: {errorRosters}</p>}
        {!loadingRosters && !errorRosters && playerRosters.length === 0 && <p>No player rosters found.</p>}
        {!loadingRosters && !errorRosters && playerRosters.length > 0 && (
          <div className="overflow-x-auto shadow-md rounded-lg">
            <table className="min-w-full bg-white border border-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-3 px-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-600">Player Name</th>
                  <th className="py-3 px-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-600">Jersey No.</th>
                  <th className="py-3 px-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-600">Position</th>
                  <th className="py-3 px-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-600">Team Context</th>
                  <th className="py-3 px-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-600">Team Name</th>
                  <th className="py-3 px-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-600">Match Date</th>
                  <th className="py-3 px-4 border-b border-gray-200 text-left text-sm font-semibold text-gray-600">Competition</th>
                </tr>
              </thead>
              <tbody>
                {playerRosters.map((player, index) => (
                  <tr key={player.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="py-2 px-4 border-b border-gray-200">{player.player_name}</td>
                    <td className="py-2 px-4 border-b border-gray-200">{player.jersey_number}</td>
                    <td className="py-2 px-4 border-b border-gray-200">{player.position}</td>
                    <td className="py-2 px-4 border-b border-gray-200">{player.team_context}</td>
                    <td className="py-2 px-4 border-b border-gray-200">{player.team_name || 'N/A'}</td>
                    <td className="py-2 px-4 border-b border-gray-200">{player.match_date ? new Date(player.match_date).toLocaleDateString() : 'N/A'}</td>
                    <td className="py-2 px-4 border-b border-gray-200">{player.competition || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Live Match Event Feed Section */}
      <section className="mt-8">
        <h2 className="text-xl font-semibold mb-3">Live Match Event Feed</h2>
        <div className="mb-4 p-4 border rounded-lg shadow-sm bg-gray-50">
          <label htmlFor="match-select-feed" className="block text-sm font-medium text-gray-700 mb-1">
            Select Match for Live Feed:
          </label>
          <Select
            value={selectedMatchIdForFeed || ""}
            onValueChange={(value) => setSelectedMatchIdForFeed(value === "none" ? null : value)}
          >
            <SelectTrigger id="match-select-feed" className="w-full md:w-1/2 lg:w-1/3">
              <SelectValue placeholder="Select a match..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {loadingMatches && <SelectItem value="loading" disabled>Loading matches...</SelectItem>}
              {!loadingMatches && matches.map((match) => (
                <SelectItem key={match.id} value={match.id}>
                  {`${match.home_team_name} vs ${match.away_team_name} (${new Date(match.match_date).toLocaleDateString()})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedMatchIdForFeed ? (
          <RealTimeMatchEvents matchId={selectedMatchIdForFeed} />
        ) : (
          <p className="text-center text-gray-500 py-8">Select a match to view its live event feed.</p>
        )}
      </section>
    </div>
  );
}
