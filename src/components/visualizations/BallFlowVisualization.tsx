
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Player, BallTrackingPoint, Team, PlayerNode } from '@/types';

interface BallFlowVisualizationProps {
  ballTrackingPoints: BallTrackingPoint[];
  homeTeam: Team;
  awayTeam: Team;
  width?: number;
  height?: number;
}

interface BallFlow {
  source: number;
  target: number;
  value: number;
  sourceTeam: 'home' | 'away';
  targetTeam: 'home' | 'away';
}

interface FlowPlayerNode extends PlayerNode {
  team: 'home' | 'away';
  count: number;
}

const BallFlowVisualization: React.FC<BallFlowVisualizationProps> = ({
  ballTrackingPoints,
  homeTeam,
  awayTeam,
  width = 800,
  height = 600
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  
  const handleNodeDrag = (event: any, d: FlowPlayerNode) => {
    d.fx = event.x;
    d.fy = event.y;
  };

  const handleNodeDragEnd = (event: any, d: FlowPlayerNode) => {
    d.fx = null;
    d.fy = null;
  };

  const handleNodeDragStart = (event: any, d: FlowPlayerNode) => {
    d.fx = d.x;
    d.fy = d.y;
  };

  useEffect(() => {
    if (!svgRef.current || ballTrackingPoints.length < 2) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous visualization
    
    // Prepare data
    const playerMap = new Map<number, FlowPlayerNode>();
    
    // Add all players to the map
    homeTeam.players.forEach(player => {
      playerMap.set(player.id, {
        id: player.id,
        name: player.name,
        team: 'home',
        count: 0
      });
    });
    
    awayTeam.players.forEach(player => {
      playerMap.set(player.id, {
        id: player.id,
        name: player.name,
        team: 'away',
        count: 0
      });
    });
    
    // Count ball possession for each player
    const flows: BallFlow[] = [];
    const flowMap = new Map<string, number>();
    
    // Process ball tracking points to create flows
    for (let i = 0; i < ballTrackingPoints.length - 1; i++) {
      const current = ballTrackingPoints[i];
      const next = ballTrackingPoints[i + 1];
      
      if (
        current.playerId && 
        next.playerId && 
        current.playerId !== next.playerId &&
        current.teamId && 
        next.teamId
      ) {
        const sourceTeam = current.teamId === homeTeam.id ? 'home' : 'away';
        const targetTeam = next.teamId === homeTeam.id ? 'home' : 'away';
        
        const flowKey = `${current.playerId}-${next.playerId}`;
        const value = (flowMap.get(flowKey) || 0) + 1;
        flowMap.set(flowKey, value);
        
        // Update player counts
        if (playerMap.has(current.playerId)) {
          const player = playerMap.get(current.playerId)!;
          player.count += 1;
        }
        
        if (playerMap.has(next.playerId)) {
          const player = playerMap.get(next.playerId)!;
          player.count += 1;
        }
        
        flows.push({
          source: current.playerId,
          target: next.playerId,
          value,
          sourceTeam,
          targetTeam
        });
      }
    }
    
    // Create nodes array from player map
    const nodes = Array.from(playerMap.values())
      .filter(player => player.count > 0) // Only include players who have touched the ball
      .sort((a, b) => a.team === b.team ? 0 : a.team === 'home' ? -1 : 1); // Sort by team
    
    // Create D3 force simulation
    const simulation = d3.forceSimulation()
      .force('link', d3.forceLink().id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));
    
    // Create links with flow data
    const links = svg.append('g')
      .selectAll('path')
      .data(flows)
      .enter()
      .append('path')
      .attr('class', 'flow-path')
      .attr('stroke', d => {
        if (d.sourceTeam === 'home' && d.targetTeam === 'home') {
          return '#1A365D'; // Home to home
        } else if (d.sourceTeam === 'away' && d.targetTeam === 'away') {
          return '#D3212C'; // Away to away
        } else {
          return '#FFD700'; // Cross-team (interceptions)
        }
      })
      .attr('stroke-opacity', 0.7)
      .attr('stroke-width', d => Math.sqrt(d.value) * 2)
      .attr('fill', 'none');
    
    // Create interactive tooltips
    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('background', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('padding', '8px')
      .style('border-radius', '4px')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('z-index', 1000);
    
    // Create nodes
    const nodeElements = svg.append('g')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'player-node')
      .call(d3.drag<SVGGElement, FlowPlayerNode>()
        .on('start', handleNodeDragStart)
        .on('drag', handleNodeDrag)
        .on('end', handleNodeDragEnd)
      );
    
    // Add colored circles for each team
    nodeElements
      .append('circle')
      .attr('r', d => Math.max(15, Math.min(40, 10 + d.count * 3)))
      .attr('fill', d => d.team === 'home' ? '#1A365D' : '#D3212C')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .on('mouseover', (event, d) => {
        tooltip.transition()
          .duration(200)
          .style('opacity', .9);
        
        // Get incoming and outgoing flows
        const outgoing = flows.filter(flow => flow.source === d.id);
        const incoming = flows.filter(flow => flow.target === d.id);
        
        tooltip.html(`
          <strong>${d.name} (${d.team === 'home' ? homeTeam.name : awayTeam.name})</strong><br/>
          Ball touches: ${d.count}<br/>
          Passed to: ${outgoing.length} players<br/>
          Received from: ${incoming.length} players
        `)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 28) + 'px');
        
        // Highlight connected paths
        links
          .attr('stroke-opacity', flow => 
            flow.source === d.id || flow.target === d.id ? 1 : 0.1
          )
          .attr('stroke-width', flow => 
            flow.source === d.id || flow.target === d.id ? Math.sqrt(flow.value) * 3 : Math.sqrt(flow.value) * 1
          );
      })
      .on('mouseout', () => {
        tooltip.transition()
          .duration(500)
          .style('opacity', 0);
        
        links
          .attr('stroke-opacity', 0.7)
          .attr('stroke-width', d => Math.sqrt(d.value) * 2);
      });
    
    // Add player number text
    nodeElements
      .append('text')
      .text(d => {
        const player = [...homeTeam.players, ...awayTeam.players].find(p => p.id === d.id);
        return player ? player.jersey_number : '';
      })
      .attr('text-anchor', 'middle')
      .attr('dy', '.3em')
      .attr('fill', 'white')
      .attr('font-weight', 'bold')
      .attr('font-size', '12px');
    
    // Add player name text (visible on hover)
    nodeElements
      .append('title')
      .text(d => `${d.name} (${d.team === 'home' ? homeTeam.name : awayTeam.name})`);
    
    // Update function for simulation
    simulation.nodes(nodes as any).on('tick', () => {
      links.attr('d', (d: any) => {
        const source = nodes.find(n => n.id === d.source) as any;
        const target = nodes.find(n => n.id === d.target) as any;
        
        if (!source || !target) return '';
        
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dr = Math.sqrt(dx * dx + dy * dy) * 2; // Curve radius
        
        // Create a curved path
        return `M${source.x},${source.y}A${dr},${dr} 0 0,1 ${target.x},${target.y}`;
      });
      
      nodeElements.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });
    
    // Add legend
    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', 'translate(20, 20)');
    
    legend.append('rect')
      .attr('width', 15)
      .attr('height', 15)
      .attr('fill', '#1A365D');
    
    legend.append('text')
      .attr('x', 20)
      .attr('y', 12)
      .text(homeTeam.name)
      .attr('font-size', '12px');
    
    legend.append('rect')
      .attr('width', 15)
      .attr('height', 15)
      .attr('fill', '#D3212C')
      .attr('transform', 'translate(0, 20)');
    
    legend.append('text')
      .attr('x', 20)
      .attr('y', 32)
      .text(awayTeam.name)
      .attr('font-size', '12px');
    
    legend.append('path')
      .attr('d', 'M0,60 L30,60')
      .attr('stroke', '#FFD700')
      .attr('stroke-width', 3);
    
    legend.append('text')
      .attr('x', 35)
      .attr('y', 65)
      .text('Interception')
      .attr('font-size', '12px');
    
    return () => {
      simulation.stop();
      tooltip.remove();
    };
  }, [ballTrackingPoints, homeTeam, awayTeam, width, height]);
  
  return (
    <div className="ball-flow-visualization-container">
      <div className="p-4 bg-white rounded-md shadow overflow-hidden">
        <h3 className="text-lg font-medium mb-4">Ball Flow Visualization</h3>
        <div className="border rounded-md">
          <svg 
            ref={svgRef} 
            width={width} 
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className="w-full bg-gray-50"
            style={{ minHeight: '500px' }}
          />
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          <p>This visualization shows ball movement between players. Circle size represents ball possession frequency.</p>
          <p>Drag nodes to rearrange. Hover for detailed player stats. Lines show passes (thicker = more passes).</p>
        </div>
      </div>
    </div>
  );
};

export default BallFlowVisualization;
