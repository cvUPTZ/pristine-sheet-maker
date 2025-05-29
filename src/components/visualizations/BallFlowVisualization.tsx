
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { BallTrackingPoint, Team, FlowPlayerNode } from '@/types';

interface BallFlowVisualizationProps {
  ballTrackingPoints: BallTrackingPoint[];
  homeTeam: Team;
  awayTeam: Team;
}

const BallFlowVisualization: React.FC<BallFlowVisualizationProps> = ({
  ballTrackingPoints,
  homeTeam,
  awayTeam
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ballTrackingPoints.length || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 600;
    const height = 400;
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };

    svg.attr("width", width).attr("height", height);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create scales
    const xScale = d3.scaleLinear()
      .domain([0, 1])
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain([0, 1])
      .range([innerHeight, 0]);

    // Create nodes and links from ball tracking data
    const nodes: FlowPlayerNode[] = [];
    const links: any[] = [];

    // Process ball tracking points to create flow data
    const playerBallTouches: { [key: number]: number } = {};
    
    ballTrackingPoints.forEach((point, index) => {
      if (point.player_id !== undefined) {
        playerBallTouches[point.player_id] = (playerBallTouches[point.player_id] || 0) + 1;
        
        if (index > 0 && ballTrackingPoints[index - 1].player_id !== undefined) {
          const sourceId = ballTrackingPoints[index - 1].player_id!;
          const targetId = point.player_id;
          
          if (sourceId !== targetId) {
            const existingLink = links.find(l => l.source === sourceId && l.target === targetId);
            if (existingLink) {
              existingLink.value++;
            } else {
              links.push({ source: sourceId, target: targetId, value: 1 });
            }
          }
        }
      }
    });

    // Create nodes for home team
    homeTeam.players.forEach(player => {
      const count = playerBallTouches[player.id] || 0;
      if (count > 0) {
        nodes.push({
          id: player.id,
          name: player.player_name || player.name,
          x: 0,
          y: 0,
          count: count,
          team: 'home'
        });
      }
    });

    // Create nodes for away team
    awayTeam.players.forEach(player => {
      const count = playerBallTouches[player.id] || 0;
      if (count > 0) {
        nodes.push({
          id: player.id,
          name: player.player_name || player.name,
          x: 0,
          y: 0,
          count: count,
          team: 'away'
        });
      }
    });

    if (nodes.length === 0) {
      g.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight / 2)
        .attr("text-anchor", "middle")
        .text("No ball flow data available");
      return;
    }

    // Create force simulation
    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(80))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(innerWidth / 2, innerHeight / 2))
      .force("x", d3.forceX().x((d: any) => d.team === 'home' ? innerWidth * 0.25 : innerWidth * 0.75).strength(0.3))
      .force("y", d3.forceY().y(innerHeight / 2).strength(0.1));

    // Create links
    const link = g.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .enter().append("line")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", (d: any) => Math.sqrt(d.value) * 2);

    // Create nodes
    const node = g.append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(nodes)
      .enter().append("g")
      .attr("class", "node");

    node.append("circle")
      .attr("r", (d: any) => Math.sqrt(d.count) * 3 + 5)
      .attr("fill", (d: any) => d.team === 'home' ? "#3b82f6" : "#ef4444")
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);

    node.append("text")
      .attr("dy", ".35em")
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("fill", "white")
      .text((d: any) => d.name.substring(0, 3));

    // Add labels with ball touches
    node.append("text")
      .attr("dy", "1.5em")
      .attr("text-anchor", "middle")
      .attr("font-size", "8px")
      .attr("fill", "#333")
      .text((d: any) => `${d.count} touches`);

    // Update positions on tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    // Add drag behavior
    const drag = d3.drag<SVGGElement, FlowPlayerNode>()
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
        d.fx = undefined;
        d.fy = undefined;
      });

    node.call(drag);

    // Add legend
    const legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${width - 100}, 20)`);

    legend.append("circle")
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("r", 8)
      .attr("fill", "#3b82f6");

    legend.append("text")
      .attr("x", 15)
      .attr("y", 0)
      .attr("dy", ".35em")
      .attr("font-size", "12px")
      .text("Home Team");

    legend.append("circle")
      .attr("cx", 0)
      .attr("cy", 20)
      .attr("r", 8)
      .attr("fill", "#ef4444");

    legend.append("text")
      .attr("x", 15)
      .attr("y", 20)
      .attr("dy", ".35em")
      .attr("font-size", "12px")
      .text("Away Team");

  }, [ballTrackingPoints, homeTeam, awayTeam]);

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-4">Ball Flow Visualization</h3>
      <svg ref={svgRef} className="border rounded-lg"></svg>
    </div>
  );
};

export default BallFlowVisualization;
