
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BallTrackingPoint, Team } from '@/types';

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
    if (!ballTrackingPoints || ballTrackingPoints.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.bottom - margin.top;

    const g = svg
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create scales
    const xScale = d3.scaleLinear()
      .domain([0, 100])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([0, 100])
      .range([height, 0]);

    // Draw pitch outline
    g.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "none")
      .attr("stroke", "black")
      .attr("stroke-width", 2);

    // Draw center line
    g.append("line")
      .attr("x1", width / 2)
      .attr("y1", 0)
      .attr("x2", width / 2)
      .attr("y2", height)
      .attr("stroke", "black")
      .attr("stroke-width", 1);

    // Process ball tracking points
    const validPoints = ballTrackingPoints.filter(point => 
      typeof point.x === 'number' && typeof point.y === 'number'
    );

    if (validPoints.length === 0) return;

    // Create line generator
    const line = d3.line<BallTrackingPoint>()
      .x(d => xScale(Number(d.x)))
      .y(d => yScale(Number(d.y)))
      .curve(d3.curveCardinal);

    // Draw ball tracking path
    g.append("path")
      .datum(validPoints)
      .attr("fill", "none")
      .attr("stroke", "red")
      .attr("stroke-width", 2)
      .attr("d", line);

    // Draw ball positions
    g.selectAll(".ball-point")
      .data(validPoints)
      .enter()
      .append("circle")
      .attr("class", "ball-point")
      .attr("cx", d => xScale(Number(d.x)))
      .attr("cy", d => yScale(Number(d.y)))
      .attr("r", 3)
      .attr("fill", d => d.team === 'home' ? 'blue' : d.team === 'away' ? 'red' : 'orange')
      .attr("opacity", 0.7);

  }, [ballTrackingPoints, homeTeam, awayTeam]);

  if (!ballTrackingPoints || ballTrackingPoints.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ball Flow Visualization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            No ball tracking data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ball Flow Visualization</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto">
          <svg ref={svgRef} className="w-full h-auto min-w-[600px]"></svg>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>{homeTeam.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>{awayTeam.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span>Neutral</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BallFlowVisualization;
