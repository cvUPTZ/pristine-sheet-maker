
import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

interface SankeyNode {
  id: string;
  name: string;
  team: 'home' | 'away';
  value?: number;
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

interface D3SankeyChartProps {
  nodes: SankeyNode[];
  links: SankeyLink[];
  width?: number;
  height?: number;
}

const D3SankeyChart: React.FC<D3SankeyChartProps> = ({
  nodes,
  links,
  width = 800,
  height = 400
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0 || links.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous content

    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create a map of node IDs to indices
    const nodeMap = new Map(nodes.map((node, i) => [node.id, i]));

    // Convert links to use indices
    const sankeyLinks = links
      .filter(link => nodeMap.has(link.source) && nodeMap.has(link.target))
      .map(link => ({
        source: nodeMap.get(link.source)!,
        target: nodeMap.get(link.target)!,
        value: link.value
      }));

    // Create D3 sankey generator
    const sankey = d3.sankey()
      .nodeWidth(15)
      .nodePadding(10)
      .extent([[margin.left, margin.top], [innerWidth, innerHeight]]);

    // Generate the sankey layout
    const { nodes: sankeyNodes, links: sankeyLinksLayout } = sankey({
      nodes: nodes.map(d => ({ ...d })),
      links: sankeyLinks
    });

    const g = svg.append("g");

    // Color scales for teams
    const colorScale = d3.scaleOrdinal()
      .domain(['home', 'away'])
      .range(['#3b82f6', '#ef4444']); // Blue for home, red for away

    // Draw links
    const link = g.selectAll(".link")
      .data(sankeyLinksLayout)
      .enter().append("path")
      .attr("class", "link")
      .attr("d", d3.sankeyLinkHorizontal())
      .style("stroke", (d: any) => {
        const sourceNode = sankeyNodes[d.source.index];
        return d3.color(colorScale(sourceNode.team as string))?.copy({ opacity: 0.3 }).toString() || '#ccc';
      })
      .style("stroke-width", (d: any) => Math.max(1, d.width))
      .style("fill", "none");

    // Add link tooltips
    link.append("title")
      .text((d: any) => {
        const sourceNode = sankeyNodes[d.source.index];
        const targetNode = sankeyNodes[d.target.index];
        return `${sourceNode.name} → ${targetNode.name}\n${d.value} passes`;
      });

    // Draw nodes
    const node = g.selectAll(".node")
      .data(sankeyNodes)
      .enter().append("g")
      .attr("class", "node")
      .attr("transform", (d: any) => `translate(${d.x0},${d.y0})`);

    // Node rectangles
    node.append("rect")
      .attr("height", (d: any) => d.y1 - d.y0)
      .attr("width", (d: any) => d.x1 - d.x0)
      .style("fill", (d: any) => colorScale(d.team))
      .style("stroke", "#000")
      .style("stroke-width", 0.5)
      .style("cursor", "pointer")
      .on("mouseover", function(event, d: any) {
        d3.select(this).style("opacity", 0.8);
      })
      .on("mouseout", function(event, d: any) {
        d3.select(this).style("opacity", 1);
      });

    // Node labels
    node.append("text")
      .attr("x", (d: any) => (d.x1 - d.x0) / 2)
      .attr("y", (d: any) => (d.y1 - d.y0) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .style("font-weight", "bold")
      .style("fill", "white")
      .style("pointer-events", "none")
      .text((d: any) => d.name.split(' ').pop()); // Show last name only

    // Add node tooltips
    node.append("title")
      .text((d: any) => {
        const totalIn = d.targetLinks?.reduce((sum: number, link: any) => sum + link.value, 0) || 0;
        const totalOut = d.sourceLinks?.reduce((sum: number, link: any) => sum + link.value, 0) || 0;
        return `${d.name}\nPasses reçues: ${totalIn}\nPasses données: ${totalOut}`;
      });

    // Add team legend
    const legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${width - 120}, 20)`);

    const legendData = [
      { team: 'home', label: 'Équipe Domicile' },
      { team: 'away', label: 'Équipe Extérieur' }
    ];

    const legendItems = legend.selectAll(".legend-item")
      .data(legendData)
      .enter().append("g")
      .attr("class", "legend-item")
      .attr("transform", (d, i) => `translate(0, ${i * 20})`);

    legendItems.append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .style("fill", d => colorScale(d.team));

    legendItems.append("text")
      .attr("x", 18)
      .attr("y", 6)
      .attr("dy", "0.35em")
      .style("font-size", "12px")
      .text(d => d.label);

  }, [nodes, links, width, height]);

  return (
    <div className="w-full">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="border rounded"
      />
    </div>
  );
};

export default D3SankeyChart;
