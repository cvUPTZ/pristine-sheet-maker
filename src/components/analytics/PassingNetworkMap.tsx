
import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import * as d3 from 'd3';
import { TeamDetailedStats, PlayerStatSummary } from '@/types';

interface PassingNetworkMapProps {
  playerStats: PlayerStatSummary[];
  homeTeam: { name: string; players: any[] }; 
  awayTeam: { name: string; players: any[] };
  period?: number;
  width?: number;
  height?: number;
  homeTeamColor?: string;
  awayTeamColor?: string;
  minPassesThreshold?: number;
}

// Define needed D3 types
interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  team: 'home' | 'away';
  radius: number;
  jerseyNumber?: string;
  x?: number;
  y?: number;
}

interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  source: string | D3Node;
  target: string | D3Node;
  value: number;
  team: 'home' | 'away';
}

const PassingNetworkMap: React.FC<PassingNetworkMapProps> = ({
  playerStats,
  homeTeam,
  awayTeam,
  period = 0, // 0 means all periods
  width = 800,
  height = 600,
  homeTeamColor = '#1d4ed8', // blue-700
  awayTeamColor = '#b91c1c', // red-700
  minPassesThreshold = 1
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedTeam, setSelectedTeam] = useState<'both' | 'home' | 'away'>('both');
  const homeTeamName = homeTeam.name;
  const awayTeamName = awayTeam.name;

  useEffect(() => {
    if (!svgRef.current || !playerStats?.length) return;

    // Clear any existing SVG content
    d3.select(svgRef.current).selectAll('*').remove();

    // Constants for layout
    const PADDING = 50; // Padding around the visualization
    const NODE_MIN_RADIUS = 15; // Minimum radius for player nodes
    const NODE_MAX_RADIUS = 35; // Maximum radius for player nodes
    const LINK_MIN_STROKE = 1; // Minimum stroke width for links
    const LINK_MAX_STROKE = 10; // Maximum stroke width for links

    // Create nodes for each player
    const playerNodes: D3Node[] = [...homeTeam.players, ...awayTeam.players]
      .map(player => {
        // Handle both string and object types by casting
        const playerName = typeof player === 'string' ? player : (player.name || player.player_name || 'Unknown');
        const playerNumber = typeof player === 'string' ? '' : (player.jerseyNumber || player.number || '');
        const playerId = typeof player === 'string' ? player : (player.id || playerName);
        
        return {
          id: String(playerId),
          name: playerName,
          team: homeTeam.players.includes(player) ? 'home' : 'away',
          radius: NODE_MIN_RADIUS,
          jerseyNumber: String(playerNumber)
        };
      });

    // Process pass data to create links
    const passLinks: D3Link[] = [];
    playerStats.forEach(player => {
      if (!player.passNetworkSent) return;

      player.passNetworkSent.forEach(pass => {
        // Skip if below threshold
        if (pass.count < minPassesThreshold) return;

        // Create a link for this pass
        passLinks.push({
          source: String(player.playerId),
          target: String(pass.toPlayerId),
          value: pass.count,
          team: player.team as 'home' | 'away'
        });
      });
    });

    // Filter based on selected team
    const filteredLinks = passLinks.filter(link => {
      if (selectedTeam === 'both') return true;
      return link.team === selectedTeam;
    });

    // Get all node IDs that are part of the filtered links
    const activeNodeIds = new Set<string>();
    filteredLinks.forEach(link => {
      activeNodeIds.add(String(link.source));
      activeNodeIds.add(String(link.target));
    });

    // Filter nodes to only include those in the active network
    const filteredNodes = playerNodes.filter(node => {
      if (selectedTeam === 'both') {
        return activeNodeIds.has(node.id);
      }
      return node.team === selectedTeam && activeNodeIds.has(node.id);
    });

    // Scale node sizes based on number of outgoing passes
    const nodeSizeScale = d3.scaleLinear()
      .domain([0, d3.max(filteredNodes, n => {
        const nodeId = n.id;
        let passCount = 0;
        filteredLinks.forEach(link => {
          if (String(link.source) === nodeId) passCount += link.value;
        });
        return passCount;
      }) || 1])
      .range([NODE_MIN_RADIUS, NODE_MAX_RADIUS]);

    // Scale link sizes based on pass counts
    const linkWidthScale = d3.scaleLinear()
      .domain([minPassesThreshold, d3.max(filteredLinks, d => d.value) || minPassesThreshold])
      .range([LINK_MIN_STROKE, LINK_MAX_STROKE]);

    // Create the SVG container
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${PADDING}, ${PADDING})`);

    // Set up the simulation
    const simulation = d3.forceSimulation<D3Node>(filteredNodes)
      .force('charge', d3.forceManyBody().strength(-100))
      .force('center', d3.forceCenter(width / 2 - PADDING, height / 2 - PADDING))
      .force('x', d3.forceX(width / 2 - PADDING).strength(0.1))
      .force('y', d3.forceY(height / 2 - PADDING).strength(0.1))
      .force('link', d3.forceLink<D3Node, D3Link>(filteredLinks)
        .id(d => d.id)
        .distance(100)
        .strength(0.2));

    // Create links
    const link = svg.append('g')
      .selectAll('line')
      .data(filteredLinks)
      .join('line')
      .attr('stroke', d => d.team === 'home' ? homeTeamColor : awayTeamColor)
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => linkWidthScale(d.value))
      .attr('marker-end', 'url(#arrow)');

    // Add arrow markers for links
    svg.append('defs').selectAll('marker')
      .data(['home', 'away'])
      .enter().append('marker')
      .attr('id', d => `arrow-${d}`)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20) // Position adjusted based on node radius
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('fill', d => d === 'home' ? homeTeamColor : awayTeamColor)
      .attr('d', 'M0,-5L10,0L0,5');

    // Create nodes
    const node = svg.append('g')
      .selectAll('g')
      .data(filteredNodes)
      .join('g');

    // Add circles for the nodes
    node.append('circle')
      .attr('r', d => {
        // Calculate total outgoing passes for this node
        const outgoingPasses = filteredLinks
          .filter(link => String(link.source) === d.id)
          .reduce((sum, link) => sum + link.value, 0);
        
        // Update node radius based on passes
        d.radius = nodeSizeScale(outgoingPasses);
        return d.radius;
      })
      .attr('fill', d => d.team === 'home' ? homeTeamColor : awayTeamColor)
      .attr('fill-opacity', 0.7)
      .attr('stroke', d => d.team === 'home' ? homeTeamColor : awayTeamColor)
      .attr('stroke-width', 2);

    // Add text labels for player names
    node.append('text')
      .text(d => `${d.name}`)
      .attr('text-anchor', 'middle')
      .attr('dy', -10)
      .attr('font-size', '10px')
      .attr('fill', 'black');

    // Add jersey numbers
    node.append('text')
      .text(d => d.jerseyNumber || '')
      .attr('text-anchor', 'middle')
      .attr('dy', 5)
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('fill', 'white');

    // Set up simulation ticks
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as D3Node).x!)
        .attr('y1', d => (d.source as D3Node).y!)
        .attr('x2', d => (d.target as D3Node).x!)
        .attr('y2', d => (d.target as D3Node).y!);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Add drag behavior
    node.call(d3.drag<SVGGElement, D3Node>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }) as any); // <--- Added 'as any' here

    // Initial legend for teams
    const legend = svg.append('g')
      .attr('transform', `translate(10, ${height - 80})`);

    // Home team legend item
    legend.append('circle')
      .attr('r', 6)
      .attr('fill', homeTeamColor)
      .attr('cx', 10)
      .attr('cy', 10);

    legend.append('text')
      .text(homeTeamName)
      .attr('x', 20)
      .attr('y', 15)
      .attr('font-size', '12px');

    // Away team legend item
    legend.append('circle')
      .attr('r', 6)
      .attr('fill', awayTeamColor)
      .attr('cx', 10)
      .attr('cy', 30);

    legend.append('text')
      .text(awayTeamName)
      .attr('x', 20)
      .attr('y', 35)
      .attr('font-size', '12px');

    return () => {
      simulation.stop();
    };
  }, [playerStats, homeTeam, awayTeam, selectedTeam, period, minPassesThreshold, homeTeamName, awayTeamName, homeTeamColor, awayTeamColor, width, height]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Team Passing Network</span>
          <div className="flex space-x-2">
            <button
              onClick={() => setSelectedTeam('both')}
              className={`px-3 py-1 text-xs rounded ${selectedTeam === 'both' ? 'bg-gray-800 text-white' : 'bg-gray-200'}`}
            >
              Both Teams
            </button>
            <button
              onClick={() => setSelectedTeam('home')}
              className={`px-3 py-1 text-xs rounded ${selectedTeam === 'home' ? 'bg-blue-700 text-white' : 'bg-blue-100'}`}
              style={{ backgroundColor: selectedTeam === 'home' ? homeTeamColor : undefined }}
            >
              {homeTeamName}
            </button>
            <button
              onClick={() => setSelectedTeam('away')}
              className={`px-3 py-1 text-xs rounded ${selectedTeam === 'away' ? 'bg-red-700 text-white' : 'bg-red-100'}`}
              style={{ backgroundColor: selectedTeam === 'away' ? awayTeamColor : undefined }}
            >
              {awayTeamName}
            </button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded overflow-hidden">
          <svg ref={svgRef} width={width} height={height} className="mx-auto"></svg>
        </div>
        <div className="text-xs text-gray-500 mt-2 text-center">
          * Node size represents number of outgoing passes, line thickness represents pass frequency
        </div>
      </CardContent>
    </Card>
  );
};

export default PassingNetworkMap;
