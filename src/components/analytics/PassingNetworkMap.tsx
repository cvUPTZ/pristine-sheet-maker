
// src/components/analytics/PassingNetworkMap.tsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Player, Team } from '@/types';
import { PlayerStatSummary } from '@/types'; // Update this import path if needed
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const DEFAULT_PITCH_LENGTH = 105; // Should match SVG_VIEWBOX_WIDTH if pitch takes full viewbox
const DEFAULT_PITCH_WIDTH = 68;  // Should match SVG_VIEWBOX_HEIGHT
const SVG_MARGIN = { top: 5, right: 5, bottom: 5, left: 5 }; // Margin for elements within SVG
const SVG_VIEWBOX_WIDTH = DEFAULT_PITCH_LENGTH + SVG_MARGIN.left + SVG_MARGIN.right;
const SVG_VIEWBOX_HEIGHT = DEFAULT_PITCH_WIDTH + SVG_MARGIN.top + SVG_MARGIN.bottom;


interface PassingNetworkMapProps {
  playerStats: PlayerStatSummary[];
  allPlayers: Player[]; // Used to ensure all potential nodes are considered
  homeTeam?: Team;
  awayTeam?: Team;
  pitchLength?: number;
  pitchWidth?: number;
}

// D3 Node type - PlayerStatSummary can be extended or used as part of it
interface D3Node extends d3.SimulationNodeDatum {
  id: string; // Player ID
  name: string;
  jerseyNumber?: number;
  teamId?: 'home' | 'away';
  playerData: PlayerStatSummary; // Original player stat data
  initialX?: number; // Store initial position from formation
  initialY?: number;
  radius: number;
}

// D3 Link type
interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  source: string; // ID of source node
  target: string; // ID of target node
  count: number;
  successfulCount: number;
  successRate: number;
}


const PassingNetworkMap: React.FC<PassingNetworkMapProps> = ({
  playerStats,
  allPlayers,
  homeTeam,
  awayTeam,
  pitchLength = DEFAULT_PITCH_LENGTH,
  pitchWidth = DEFAULT_PITCH_WIDTH,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [filterTeamId, setFilterTeamId] = useState<'all' | 'home' | 'away'>('all');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | number | 'all'>('all');

  // Function to get player's initial position based on a simple formation layout
  const getPlayerInitialPosition = (player: Player, teamId: 'home' | 'away' | undefined, playerIndex: number, teamPlayerCount: number) => {
    let x = SVG_MARGIN.left;
    let y = SVG_MARGIN.top;
    const lines = [pitchLength * 0.15, pitchLength * 0.4, pitchLength * 0.65, pitchLength * 0.85];

    const jerseyNumber = player.number || player.jersey_number || 0;

    if (jerseyNumber === 1) { // GK
      x = lines[0] * 0.5; y = pitchWidth / 2;
    } else if (jerseyNumber >= 2 && jerseyNumber <= 5) { // DEF
      x = lines[0]; y = (( (playerIndex % 4) + 1) * pitchWidth / 5);
    } else if (jerseyNumber >= 6 && jerseyNumber <= 8 || jerseyNumber === 10) { // MID
      x = lines[1] + (playerIndex % 2 === 0 ? 0 : (lines[2]-lines[1])/2); y = ( ( (playerIndex % 4) + 1) * pitchWidth / 5);
    } else { // FWD
      x = lines[3]; y = ( ( (playerIndex % 2) + 1) * pitchWidth / 3);
    }
    if (teamId === 'away') x = pitchLength - x;

    return { x: SVG_MARGIN.left + x, y: SVG_MARGIN.top + y };
  };


  const { d3Nodes, d3Links } = useMemo((): { d3Nodes: D3Node[], d3Links: D3Link[] } => {
    const currentPlayersInStats = playerStats.filter(ps => {
      if (filterTeamId === 'all') return true;
      return ps.team === filterTeamId;
    });

    // If a player is selected, filter to show only that player and those they interacted with directly.
    let relevantPlayerIds = new Set<string>();
    if (selectedPlayerId !== 'all') {
      relevantPlayerIds.add(String(selectedPlayerId));
      playerStats.forEach(ps => {
        if (String(ps.playerId) === String(selectedPlayerId)) {
          ps.passNetworkSent?.forEach(link => relevantPlayerIds.add(String(link.toPlayerId)));
        }
        ps.passNetworkSent?.forEach(link => {
          if (String(link.toPlayerId) === String(selectedPlayerId)) {
            relevantPlayerIds.add(String(ps.playerId));
          }
        });
      });
    }

    const nodes: D3Node[] = currentPlayersInStats
      .filter(ps => selectedPlayerId === 'all' || relevantPlayerIds.has(String(ps.playerId)))
      .map((ps, index) => {
        const playerInfo = allPlayers.find(p => String(p.id) === String(ps.playerId)) ||
                           { id: ps.playerId, name: ps.playerName, jersey_number: ps.jerseyNumber, position: 'Unknown' } as Player; // Fallback
        const initialPos = getPlayerInitialPosition(playerInfo, ps.team, index, currentPlayersInStats.length);
        const totalPasses = (ps.passesAttempted || 0);
        return {
          id: String(ps.playerId),
          name: ps.playerName,
          jerseyNumber: ps.jerseyNumber,
          teamId: ps.team,
          playerData: ps,
          initialX: initialPos.x,
          initialY: initialPos.y,
          radius: 3 + Math.min(7, Math.sqrt(totalPasses) * 0.5), // Radius based on pass involvement
          // D3 simulation will add x, y, vx, vy etc.
        };
      });

    const nodeIds = new Set(nodes.map(n => n.id));
    const links: D3Link[] = [];

    currentPlayersInStats.forEach(ps => {
      if (!nodeIds.has(String(ps.playerId))) return; // Source player not in filtered nodes

      ps.passNetworkSent?.forEach(link => {
        if (!nodeIds.has(String(link.toPlayerId))) return; // Target player not in filtered nodes

        // If a specific player selected, only show links from/to them
        if (selectedPlayerId !== 'all' && String(ps.playerId) !== String(selectedPlayerId) && String(link.toPlayerId) !== String(selectedPlayerId)) {
            return;
        }

        links.push({
          source: String(ps.playerId),
          target: String(link.toPlayerId),
          count: link.count,
          successfulCount: link.successfulCount,
          successRate: link.count > 0 ? link.successfulCount / link.count : 0,
        });
      });
    });
    return { d3Nodes: nodes, d3Links: links };
  }, [playerStats, allPlayers, filterTeamId, selectedPlayerId, pitchLength, pitchWidth]);


  useEffect(() => {
    if (!svgRef.current || d3Nodes.length === 0) {
        // Clear SVG if no nodes
        if (svgRef.current) d3.select(svgRef.current).selectAll("*").remove();
        return;
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous elements

    // Add pitch markings (can be done once if static, or here if dynamic aspects)
    const pitchGroup = svg.append("g").attr("id", "pitch-markings");
    pitchGroup.append("rect")
        .attr("x", SVG_MARGIN.left)
        .attr("y", SVG_MARGIN.top)
        .attr("width", pitchLength)
        .attr("height", pitchWidth)
        .attr("fill", "none")
        .attr("stroke", "rgba(255,255,255,0.3)")
        .attr("stroke-width", "0.5");
    // Add other pitch lines as needed, similar to the original SVG

    // Arrowhead definition
    svg.append("defs").append("marker")
        .attr("id", "arrowhead-d3")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 19) // Adjusted for link stroke width and node radius
        .attr("refY", 0)
        .attr("markerWidth", 5)
        .attr("markerHeight", 5)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "#777");

    const linkGroup = svg.append("g").attr("class", "links");
    const nodeGroup = svg.append("g").attr("class", "nodes");

    // Initialize nodes with starting positions (fx, fy to fix, or x, y for initial)
    d3Nodes.forEach(node => {
      node.x = node.initialX;
      node.y = node.initialY;
    });

    const simulation = d3.forceSimulation(d3Nodes)
        .force("link", d3.forceLink<D3Node, D3Link>(d3Links)
            .id(d => d.id)
            .distance(link => 70 + Math.max(0, 20 - link.count)) // Shorter distance for more passes
            .strength(link => 0.1 + (link.count / 10) * 0.2) // Stronger links for more passes
        )
        .force("charge", d3.forceManyBody().strength(-150))
        .force("center", d3.forceCenter((pitchLength / 2) + SVG_MARGIN.left, (pitchWidth / 2) + SVG_MARGIN.top))
        .force("collide", d3.forceCollide<D3Node>().radius(d => d.radius + 3).iterations(2));


    const linkElements = linkGroup
        .selectAll("line")
        .data(d3Links)
        .join("line")
        .attr("stroke-width", d => Math.min(0.5 + (d.count * 0.3), 5)) // Max stroke width 5
        .attr("stroke", "#777")
        .attr("opacity", d => 0.4 + d.successRate * 0.6)
        .attr("marker-end", "url(#arrowhead-d3)");

    const nodeElements = nodeGroup
        .selectAll<SVGGElement, D3Node>("g")
        .data(d3Nodes, d => d.id)
        .join("g")
        .call(d3.drag<SVGGElement, D3Node>()
            .on("start", (event, d) => {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            })
            .on("drag", (event, d) => {
                d.fx = event.x;
                d.fy = event.y;
            })
            .on("end", (event, d) => {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null; // Set to null to unfix, or keep fx,fy to fix after drag
                d.fy = null;
            })
        );

    nodeElements.append("circle")
        .attr("r", d => d.radius)
        .attr("fill", d => d.teamId === 'home' ? 'blue' : (d.teamId === 'away' ? 'red' : 'grey'))
        .attr("stroke", "#fff")
        .attr("stroke-width", 0.5);

    nodeElements.append("text")
        .text(d => d.jerseyNumber || d.name.substring(0,1))
        .attr("text-anchor", "middle")
        .attr("dy", ".3em")
        .attr("font-size", d => Math.max(3, d.radius * 0.7) + "px")
        .attr("fill", "white");

    // Add simple title tooltips (SVG native)
    linkElements.append("title")
      .text(d => {
        const sourceNode = d.source as D3Node;
        const targetNode = d.target as D3Node;
        return `From: ${sourceNode.name} (#${sourceNode.jerseyNumber})\nTo: ${targetNode.name} (#${targetNode.jerseyNumber})\nPasses: ${d.count} (${d.successfulCount} succ.)`;
      });

    nodeElements.append("title")
      .text(d => `${d.name} (#${d.jerseyNumber})\nTeam: ${d.teamId}\nPasses Attempted: ${d.playerData.passesAttempted || 0}`);

    simulation.on("tick", () => {
        linkElements
            .attr("x1", d => (d.source as D3Node).x!)
            .attr("y1", d => (d.source as D3Node).y!)
            .attr("x2", d => (d.target as D3Node).x!)
            .attr("y2", d => (d.target as D3Node).y!);
        nodeElements
            .attr("transform", d => `translate(${d.x},${d.y})`);
    });

    // Cleanup simulation on component unmount
    return () => {
        simulation.stop();
    };

  }, [d3Nodes, d3Links, pitchLength, pitchWidth]); // Dependencies for D3 rendering


  const handleTeamFilterChange = (value: string) => {
    setFilterTeamId(value as 'all' | 'home' | 'away');
    setSelectedPlayerId('all');
  };

  const handlePlayerFilterChange = (value: string) => {
    setSelectedPlayerId(value === 'all' ? 'all' : value); // Player ID is string or number
  };

  const getTeamPlayersForFilter = (): Player[] => {
    if (filterTeamId === 'home') {
      return homeTeam?.players || allPlayers.filter(p => 
        d3Nodes.find(node => node.id === String(p.id) && node.teamId === 'home')
      );
    }
    if (filterTeamId === 'away') {
      return awayTeam?.players || allPlayers.filter(p => 
        d3Nodes.find(node => node.id === String(p.id) && node.teamId === 'away')
      );
    }
    return allPlayers;
  };

  // Extract values from homeTeam and awayTeam for display
  const homeTeamName = homeTeam?.name || 'Home';
  const awayTeamName = awayTeam?.name || 'Away';

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
                <SelectItem value="home">{homeTeamName}</SelectItem>
                <SelectItem value="away">{awayTeamName}</SelectItem>
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
              ref={svgRef}
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
              <rect x={SVG_MARGIN.left} y={SVG_MARGIN.top} width={pitchLength} height={pitchWidth} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
              <line x1={SVG_MARGIN.left + pitchLength / 2} y1={SVG_MARGIN.top} x2={SVG_MARGIN.left + pitchLength / 2} y2={SVG_MARGIN.top + pitchWidth} stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
              <circle cx={SVG_MARGIN.left + pitchLength / 2} cy={SVG_MARGIN.top + pitchWidth / 2} r={pitchWidth / 7} stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" fill="none" />
              <rect x={SVG_MARGIN.left} y={SVG_MARGIN.top + (pitchWidth - 40.32) / 2} width="16.5" height="40.32" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" fill="none" />
              <rect x={SVG_MARGIN.left + pitchLength - 16.5} y={SVG_MARGIN.top + (pitchWidth - 40.32) / 2} width="16.5" height="40.32" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" fill="none" />
              
              {/* D3 visualization will be appended via the useEffect hook */}
            </svg>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
};

export default PassingNetworkMap;
