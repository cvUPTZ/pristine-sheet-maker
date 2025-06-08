// src/components/analytics/PassingNetworkMap.tsx
import React, { useState, useMemo } from 'react';
import { Player, Team } from '@/types';
import { PlayerStatSummary } from '@/lib/analytics/eventAggregator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const DEFAULT_PITCH_LENGTH = 105;
const DEFAULT_PITCH_WIDTH = 68;
const SVG_VIEWBOX_WIDTH = DEFAULT_PITCH_LENGTH + 10;
const SVG_VIEWBOX_HEIGHT = DEFAULT_PITCH_WIDTH + 10;
const PADDING = 5;

interface PassingNetworkMapProps {
  playerStats: PlayerStatSummary[];
  allPlayers: Player[];
  homeTeam?: Team;
  awayTeam?: Team;
  pitchLength?: number;
  pitchWidth?: number;
}

interface PlayerNode extends Player {
  x: number;
  y: number;
  passesSentCount?: number;
  passesReceivedCount?: number; // To be calculated if needed
  teamId?: 'home' | 'away'; // To store team context for coloring
}

interface PassLink {
  fromPlayerId: string | number;
  toPlayerId: string | number;
  count: number;
  successfulCount: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

const PassingNetworkMap: React.FC<PassingNetworkMapProps> = ({
  playerStats,
  allPlayers,
  homeTeam,
  awayTeam,
  pitchLength = DEFAULT_PITCH_LENGTH,
  pitchWidth = DEFAULT_PITCH_WIDTH,
}) => {
  const [filterTeamId, setFilterTeamId] = useState<'all' | 'home' | 'away'>('all');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | number | 'all'>('all');

  const { playerNodes, passLinks } = useMemo(() => {
    const nodes: Record<string | number, PlayerNode> = {};
    const links: PassLink[] = [];

    const getPlayerPosition = (player: Player, teamId?: 'home' | 'away', playerIndex: number = 0, teamPlayerCount: number = 11) => {
      // Placeholder: Distribute players roughly in a 4-4-2 like formation
      // This should be replaced with actual average positions or formation data
      let x = PADDING;
      let y = PADDING;
      const lines = [pitchLength * 0.15, pitchLength * 0.4, pitchLength * 0.65, pitchLength * 0.85]; // Defensive, Mid1, Mid2, Forward lines

      // Crude line assignment based on typical player numbers or index
      const jerseyNumber = player.number || player.jersey_number || 0;

      if (jerseyNumber === 1) { // Goalkeeper
        x = lines[0] * 0.5;
        y = pitchWidth / 2;
      } else if (jerseyNumber >= 2 && jerseyNumber <= 5) { // Defenders
        x = lines[0];
        y = ( ( (playerIndex % 4) + 1) * pitchWidth / 5 );
      } else if (jerseyNumber >= 6 && jerseyNumber <= 8 || jerseyNumber === 10) { // Midfielders
        x = lines[1] + (playerIndex % 2 === 0 ? 0 : (lines[2]-lines[1])/2); // Stagger midfielders
        y = ( ( (playerIndex % 4) + 1) * pitchWidth / 5 );
      } else { // Forwards (9, 11) or remaining
        x = lines[3];
        y = ( ( (playerIndex % 2) + 1) * pitchWidth / 3 );
      }

      if (teamId === 'away') { // Assuming away team attacks from right to left on this normalized map
         x = pitchLength - x; // Flip X for away team for consistent map view
      }

      return { x: PADDING + x, y: PADDING + y };
    };

    const playersToProcess = allPlayers.filter(p => {
        if (filterTeamId === 'all') return true;
        const stat = playerStats.find(ps => ps.playerId === p.id);
        return stat?.team === filterTeamId;
    });

    playersToProcess.forEach((player, index) => {
      const stat = playerStats.find(ps => ps.playerId === player.id);
      const teamIdForPos = stat?.team;
      const basePos = getPlayerPosition(player, teamIdForPos, index, playersToProcess.length);

      nodes[player.id] = {
        ...player,
        x: basePos.x,
        y: basePos.y,
        passesSentCount: stat?.passNetworkSent?.reduce((sum, link) => sum + link.count, 0) || 0,
        teamId: stat?.team
      };
    });

    playerStats.forEach(stat => {
      const isPlayerSelected = selectedPlayerId === 'all' || stat.playerId === selectedPlayerId;
      const isTeamSelected = filterTeamId === 'all' || stat.team === filterTeamId;

      if (!isTeamSelected) return; // Skip if team doesn't match filter

      const fromNode = nodes[stat.playerId];
      if (!fromNode) return;

      stat.passNetworkSent?.forEach(link => {
        const toNode = nodes[link.toPlayerId];
        if (!toNode) return;

        // If a specific player is selected, only show their links (both sent and received)
        if (selectedPlayerId !== 'all' && stat.playerId !== selectedPlayerId && link.toPlayerId !== selectedPlayerId) {
            return;
        }

        links.push({
          fromPlayerId: stat.playerId,
          toPlayerId: link.toPlayerId,
          count: link.count,
          successfulCount: link.successfulCount,
          startX: fromNode.x,
          startY: fromNode.y,
          endX: toNode.x,
          endY: toNode.y,
        });
      });
    });
    return { playerNodes: Object.values(nodes).filter(n => n.teamId === filterTeamId || filterTeamId === 'all'), passLinks: links };
  }, [playerStats, allPlayers, filterTeamId, selectedPlayerId, pitchLength, pitchWidth]);

  const handleTeamFilterChange = (value: string) => {
    setFilterTeamId(value as 'all' | 'home' | 'away');
    setSelectedPlayerId('all');
  };

  const handlePlayerFilterChange = (value: string) => {
    setSelectedPlayerId(value === 'all' ? 'all' : value); // Player ID is string or number
  };

  const getTeamPlayersForFilter = (): Player[] => {
    if (filterTeamId === 'home') return homeTeam?.players || allPlayers.filter(p => playerNodes.find(pn => pn.id === p.id)?.teamId === 'home');
    if (filterTeamId === 'away') return awayTeam?.players || allPlayers.filter(p => playerNodes.find(pn => pn.id === p.id)?.teamId === 'away');
    return allPlayers;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Passing Network</CardTitle>
          <div className="flex items-center space-x-2">
            <Select value={filterTeamId} onValueChange={handleTeamFilterChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                <SelectItem value="home">{homeTeam?.name || 'Home'}</SelectItem>
                <SelectItem value="away">{awayTeam?.name || 'Away'}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={String(selectedPlayerId)} onValueChange={handlePlayerFilterChange}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Player (involved)" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Players (Network)</SelectItem>
                    {getTeamPlayersForFilter().map(p => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.name || `Player ${p.id}`}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div style={{ width: '100%', aspectRatio: `${SVG_VIEWBOX_WIDTH} / ${SVG_VIEWBOX_HEIGHT}` }}>
            <svg
              viewBox={`0 0 ${SVG_VIEWBOX_WIDTH} ${SVG_VIEWBOX_HEIGHT}`}
              preserveAspectRatio="xMidYMid meet"
              style={{ border: '1px solid #e2e8f0', backgroundColor: '#38A169' }}
            >
              <defs>
                  <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="3.5" refY="1.75" orient="auto" markerUnits="strokeWidth">
                      <polygon points="0 0, 5 1.75, 0 3.5" fill="#fff" />
                  </marker>
              </defs>
              {/* Pitch Markings */}
              <rect x={PADDING} y={PADDING} width={pitchLength} height={pitchWidth} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
              <line x1={PADDING + pitchLength / 2} y1={PADDING} x2={PADDING + pitchLength / 2} y2={PADDING + pitchWidth} stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
              <circle cx={PADDING + pitchLength / 2} cy={PADDING + pitchWidth / 2} r={pitchWidth / 7} stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" fill="none" />
              <rect x={PADDING} y={PADDING + (pitchWidth - 40.32) / 2} width="16.5" height="40.32" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" fill="none" />
              <rect x={PADDING + pitchLength - 16.5} y={PADDING + (pitchWidth - 40.32) / 2} width="16.5" height="40.32" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" fill="none" />


              {passLinks.map((link, index) => {
                const maxPassCount = Math.max(...passLinks.map(l => l.count), 0);
                const strokeWidth = 0.5 + Math.min(4, (link.count / Math.max(maxPassCount,1)) * 4 );
                const successRate = link.count > 0 ? link.successfulCount / link.count : 0;
                const opacity = 0.3 + (successRate * 0.6); // Higher success rate = more opaque
                const fromNode = playerNodes.find(p => p.id === link.fromPlayerId);

                return (
                  <Tooltip key={`link-${link.fromPlayerId}-${link.toPlayerId}-${index}`}>
                    <TooltipTrigger asChild>
                      <line
                        x1={link.startX}
                        y1={link.startY}
                        x2={link.endX}
                        y2={link.endY}
                        stroke={fromNode?.teamId === 'home' ? "rgba(100,100,255,0.9)" : "rgba(255,100,100,0.9)"} // Blue for home, Red for away
                        strokeWidth={strokeWidth}
                        opacity={opacity}
                        markerEnd="url(#arrowhead)"
                        style={{ cursor: 'pointer' }}
                      />
                    </TooltipTrigger>
                    <TooltipContent className="bg-background border shadow-lg p-2 rounded-md text-xs">
                      <p>From: {playerNodes.find(p=>p.id === link.fromPlayerId)?.name}</p>
                      <p>To: {playerNodes.find(p=>p.id === link.toPlayerId)?.name}</p>
                      <p>Passes: {link.count} ({link.successfulCount} successful)</p>
                      <p>Success Rate: {(successRate * 100).toFixed(0)}%</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}

              {playerNodes.map(node => {
                 const maxPassesInvolved = Math.max(...playerNodes.map(n => (n.passesSentCount || 0) + (n.passesReceivedCount || 0)), 1);
                 const nodeRadius = 2 + Math.min(5, ((node.passesSentCount || 0) / Math.max(maxPassesInvolved,1)) * 5);
                 return (
                    <Tooltip key={`node-${node.id}`}>
                      <TooltipTrigger asChild>
                        <g>
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r={nodeRadius}
                            fill={node.teamId === 'home' ? 'blue' : (node.teamId === 'away' ? 'red' : 'grey')}
                            stroke="#fff"
                            strokeWidth="0.5"
                            opacity="0.9"
                            style={{ cursor: 'pointer' }}
                          />
                           <text x={node.x} y={node.y + nodeRadius + 3} fill="white" fontSize="3" textAnchor="middle" dy=".3em">
                              {node.jersey_number || node.name?.substring(0,3)}
                          </text>
                        </g>
                      </TooltipTrigger>
                      <TooltipContent className="bg-background border shadow-lg p-2 rounded-md text-xs">
                        <p>{node.name || `Player ${node.id}`} (#{node.jersey_number})</p>
                        <p>Passes Sent: {node.passesSentCount || 0}</p>
                        {/* <p>Passes Received: {node.passesReceivedCount || 0}</p> */}
                      </TooltipContent>
                    </Tooltip>
                 );
              })}
            </svg>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
};

export default PassingNetworkMap;
