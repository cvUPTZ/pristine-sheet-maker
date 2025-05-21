
import React from 'react';
import { Link } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Match {
  id: string;
  homeTeam: { name: string };
  awayTeam: { name: string };
  date: string;
  statistics: {
    shots?: {
      home?: { onTarget?: number };
      away?: { onTarget?: number };
    };
  };
}

interface RecentMatchesListProps {
  matches: Match[];
}

const RecentMatchesList: React.FC<RecentMatchesListProps> = ({ matches }) => {
  if (matches.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No matches recorded yet
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Teams</TableHead>
          <TableHead className="text-right">Score</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {matches.map((match) => {
          const homeGoals = match.statistics?.shots?.home?.onTarget || 0;
          const awayGoals = match.statistics?.shots?.away?.onTarget || 0;
          
          return (
            <TableRow key={match.id}>
              <TableCell>
                <Link to={`/match/${match.id}`} className="hover:underline">
                  <div className="font-medium">
                    {match.homeTeam.name} v {match.awayTeam.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {match.date}
                  </div>
                </Link>
              </TableCell>
              <TableCell className="text-right font-mono font-medium">
                {homeGoals} - {awayGoals}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default RecentMatchesList;
