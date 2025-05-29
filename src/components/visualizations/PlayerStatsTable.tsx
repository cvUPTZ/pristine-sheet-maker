import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface PlayerStatsTableProps {
  stats: { name: string; value: number | string }[];
}

const PlayerStatsTable: React.FC<PlayerStatsTableProps> = ({ stats }) => {

  const getStatValue = (stat: any): number => {
    return typeof stat === 'number' ? stat : 0;
  };

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Statistic</TableHead>
            <TableHead className="text-right">Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stats.map((stat, index) => (
            <TableRow key={index}>
              <TableCell>{stat.name}</TableCell>
              <TableCell className="text-right">{getStatValue(stat.value)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default PlayerStatsTable;
