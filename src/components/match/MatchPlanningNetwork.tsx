
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { EVENT_TYPE_CATEGORIES } from '@/constants/eventTypes';
import { motion } from 'framer-motion';

interface NetworkNode extends d3.SimulationNodeDatum {
  id: string;
  type: 'tracker' | 'player' | 'eventType' | 'action' | 'replacement' | 'match';
  label: string;
  group: string;
  size: number;
  data?: any;
  color?: string;
  team?: 'home' | 'away';
  status?: 'online' | 'offline' | 'recording';
  batteryLevel?: number;
}

interface NetworkLink extends d3.SimulationLinkDatum<NetworkNode> {
  source: string | NetworkNode;
  target: string | NetworkNode;
  type: 'assignment' | 'capability' | 'replacement' | 'collaboration';
  strength: number;
}

interface MatchPlanningNetworkProps {
  matchId: string;
  width?: number;
  height?: number;
}

export const MatchPlanningNetwork: React.FC<MatchPlanningNetworkProps> = ({
  matchId,
  width = 800,
  height = 600
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [links, setLinks] = useState<NetworkLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);

  useEffect(() => {
    fetchMatchPlanningData();
  }, [matchId]);

  useEffect(() => {
    if (nodes.length > 0 && !loading) {
      createVisualization();
    }
  }, [nodes, links, loading]);

  const fetchMatchPlanningData = async () => {
    setLoading(true);
    try {
      // Fetch match data
      const { data: matchData } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      // Fetch tracker assignments
      const { data: assignments } = await supabase
        .from('match_tracker_assignments_view')
        .select('*')
        .eq('match_id', matchId);

      // Create mock tracker status data with more realistic scenarios
      const trackerStatus = assignments?.map((assignment, index) => ({
        tracker_id: assignment.tracker_user_id,
        status: index % 4 === 0 ? 'offline' : index % 5 === 0 ? 'recording' : 'online',
        battery_level: Math.floor(Math.random() * 100),
        activity_level: Math.floor(Math.random() * 10) + 1
      })) || [];

      if (matchData && assignments) {
        const networkData = buildNetworkData(matchData, assignments, trackerStatus);
        setNodes(networkData.nodes);
        setLinks(networkData.links);
      }
    } catch (error) {
      console.error('Error fetching match planning data:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildNetworkData = (matchData: any, assignments: any[], trackerStatus: any[]) => {
    const nodes: NetworkNode[] = [];
    const links: NetworkLink[] = [];

    // Create central match node - styled like a football
    const matchNode: NetworkNode = {
      id: `match-${matchId}`,
      type: 'match',
      label: matchData.name || 'Match',
      group: 'match',
      size: 40,
      color: '#2563EB'
    };
    nodes.push(matchNode);

    // Create tracker nodes with realistic status
    const trackerMap = new Map<string, any>();
    assignments.forEach(assignment => {
      if (assignment.tracker_user_id && !trackerMap.has(assignment.tracker_user_id)) {
        trackerMap.set(assignment.tracker_user_id, assignment);
        
        const status = trackerStatus.find(s => s.tracker_id === assignment.tracker_user_id);
        const nodeStatus = status?.status || 'offline';
        
        const trackerNode: NetworkNode = {
          id: `tracker-${assignment.tracker_user_id}`,
          type: 'tracker',
          label: assignment.tracker_email?.split('@')[0] || `Tracker ${assignment.tracker_user_id.substring(0, 8)}`,
          group: 'tracker',
          size: nodeStatus === 'recording' ? 28 : 22,
          color: nodeStatus === 'online' ? '#10B981' : nodeStatus === 'recording' ? '#F59E0B' : '#EF4444',
          status: nodeStatus as 'online' | 'offline' | 'recording',
          batteryLevel: status?.battery_level || 0,
          data: { ...assignment, status }
        };
        nodes.push(trackerNode);

        // Link tracker to match with dynamic strength based on status
        links.push({
          source: trackerNode.id,
          target: matchNode.id,
          type: 'assignment',
          strength: nodeStatus === 'online' ? 1 : nodeStatus === 'recording' ? 1.2 : 0.5
        });
      }
    });

    // Create team cluster nodes
    const homeTeamNode: NetworkNode = {
      id: 'team-home',
      type: 'action',
      label: 'Home Team',
      group: 'home',
      size: 35,
      color: '#3B82F6',
      team: 'home'
    };
    
    const awayTeamNode: NetworkNode = {
      id: 'team-away',
      type: 'action',
      label: 'Away Team',
      group: 'away',
      size: 35,
      color: '#EF4444',
      team: 'away'
    };
    
    nodes.push(homeTeamNode, awayTeamNode);
    
    // Link teams to match
    links.push(
      {
        source: homeTeamNode.id,
        target: matchNode.id,
        type: 'collaboration',
        strength: 0.8
      },
      {
        source: awayTeamNode.id,
        target: matchNode.id,
        type: 'collaboration',
        strength: 0.8
      }
    );

    // Create player nodes grouped by team
    const playerMap = new Map<string, any>();
    assignments.forEach(assignment => {
      if (assignment.player_id && !playerMap.has(assignment.player_id)) {
        playerMap.set(assignment.player_id, assignment);
        
        const playerNode: NetworkNode = {
          id: `player-${assignment.player_id}`,
          type: 'player',
          label: assignment.player_name || `Player ${assignment.player_id}`,
          group: assignment.player_team_id || 'unknown',
          size: 18,
          color: assignment.player_team_id === 'home' ? '#60A5FA' : '#F87171',
          team: assignment.player_team_id as 'home' | 'away',
          data: assignment
        };
        nodes.push(playerNode);

        // Link player to their team
        const teamNodeId = assignment.player_team_id === 'home' ? 'team-home' : 'team-away';
        links.push({
          source: playerNode.id,
          target: teamNodeId,
          type: 'collaboration',
          strength: 0.6
        });

        // Link player to their assigned tracker with stronger connection
        if (assignment.tracker_user_id) {
          links.push({
            source: `tracker-${assignment.tracker_user_id}`,
            target: playerNode.id,
            type: 'assignment',
            strength: 0.9
          });
        }
      }
    });

    // Create event type constellation
    EVENT_TYPE_CATEGORIES.forEach((category, categoryIndex) => {
      const categoryNode: NetworkNode = {
        id: `category-${category.key}`,
        type: 'eventType',
        label: category.label,
        group: 'eventType',
        size: 25,
        color: category.color,
        data: category
      };
      nodes.push(categoryNode);

      // Create orbital pattern around match for event categories
      const angle = (categoryIndex / EVENT_TYPE_CATEGORIES.length) * 2 * Math.PI;
      categoryNode.fx = (width / 2) + Math.cos(angle) * 150;
      categoryNode.fy = (height / 2) + Math.sin(angle) * 150;

      // Link to match with weaker connection for orbital effect
      links.push({
        source: categoryNode.id,
        target: matchNode.id,
        type: 'capability',
        strength: 0.2
      });

      // Create individual event nodes in smaller orbit around category
      category.events.slice(0, 4).forEach((event, eventIndex) => {
        const eventNode: NetworkNode = {
          id: `event-${event.key}`,
          type: 'action',
          label: event.label,
          group: category.key,
          size: 12,
          color: category.color,
          data: event
        };
        nodes.push(eventNode);

        // Position in small orbit around category
        const eventAngle = (eventIndex / 4) * 2 * Math.PI;
        eventNode.fx = categoryNode.fx! + Math.cos(eventAngle) * 50;
        eventNode.fy = categoryNode.fy! + Math.sin(eventAngle) * 50;

        // Link to category
        links.push({
          source: eventNode.id,
          target: categoryNode.id,
          type: 'capability',
          strength: 0.4
        });

        // Link to trackers who can track this event
        assignments.forEach(assignment => {
          if (assignment.assigned_event_types?.includes(event.key)) {
            links.push({
              source: `tracker-${assignment.tracker_user_id}`,
              target: eventNode.id,
              type: 'assignment',
              strength: 0.3
            });
          }
        });
      });
    });

    return { nodes, links };
  };

  const createVisualization = () => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Create gradient definitions for more appealing visuals
    const defs = svg.append('defs');
    
    // Football field gradient
    const fieldGradient = defs.append('linearGradient')
      .attr('id', 'fieldGradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '100%').attr('y2', '100%');
    fieldGradient.append('stop').attr('offset', '0%').attr('stop-color', '#16A34A');
    fieldGradient.append('stop').attr('offset', '100%').attr('stop-color', '#15803D');

    // Add field background
    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'url(#fieldGradient)')
      .attr('opacity', 0.1);

    // Create simulation with custom forces
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).strength(d => (d as NetworkLink).strength * 0.5))
      .force('charge', d3.forceManyBody().strength(d => {
        const node = d as NetworkNode;
        return node.type === 'match' ? -500 : node.type === 'tracker' ? -200 : -100;
      }))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d: any) => (d as NetworkNode).size + 10));

    // Create arrow markers with different styles
    const arrowTypes = [
      { id: 'assignment', color: '#3B82F6' },
      { id: 'capability', color: '#10B981' },
      { id: 'replacement', color: '#F59E0B' },
      { id: 'collaboration', color: '#8B5CF6' }
    ];

    arrowTypes.forEach(arrow => {
      defs.append('marker')
        .attr('id', `arrowhead-${arrow.id}`)
        .attr('viewBox', '-0 -5 10 10')
        .attr('refX', 25)
        .attr('refY', 0)
        .attr('orient', 'auto')
        .attr('markerWidth', 8)
        .attr('markerHeight', 8)
        .append('path')
        .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
        .attr('fill', arrow.color)
        .style('stroke', 'none');
    });

    // Create links with enhanced styling
    const link = svg.append('g')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('stroke', d => {
        switch (d.type) {
          case 'assignment': return '#3B82F6';
          case 'capability': return '#10B981';
          case 'replacement': return '#F59E0B';
          case 'collaboration': return '#8B5CF6';
          default: return '#6B7280';
        }
      })
      .attr('stroke-opacity', d => d.type === 'assignment' ? 0.8 : 0.4)
      .attr('stroke-width', d => Math.sqrt(d.strength * 4))
      .attr('stroke-dasharray', d => d.type === 'replacement' ? '8,4' : d.type === 'capability' ? '4,2' : null)
      .attr('marker-end', d => `url(#arrowhead-${d.type})`);

    // Create nodes with enhanced visuals
    const nodeGroup = svg.append('g').selectAll('g')
      .data(nodes)
      .enter().append('g')
      .attr('class', 'node-group')
      .style('cursor', 'pointer')
      .call(
        d3.drag<SVGGElement, NetworkNode>()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended)
      )
      .on('click', (event, d) => {
        setSelectedNode(d);
      });

    // Add different shapes based on node type
    nodeGroup.each(function(d: NetworkNode) {
      const group = d3.select(this);
      
      if (d.type === 'match') {
        // Football-shaped match node
        group.append('circle')
          .attr('r', d.size)
          .attr('fill', '#FFFFFF')
          .attr('stroke', d.color)
          .attr('stroke-width', 4);
        
        // Football pattern
        group.append('path')
          .attr('d', 'M-15,-8 Q0,-12 15,-8 Q0,12 -15,-8 Z')
          .attr('fill', d.color)
          .attr('opacity', 0.8);
        
        group.append('text')
          .text('⚽')
          .attr('text-anchor', 'middle')
          .attr('dy', '.35em')
          .attr('font-size', '20px');
          
      } else if (d.type === 'tracker') {
        // Tracker nodes with status indicators
        const baseCircle = group.append('circle')
          .attr('r', d.size)
          .attr('fill', d.color)
          .attr('stroke', '#FFFFFF')
          .attr('stroke-width', 3);

        if (d.status === 'recording') {
          // Pulsing effect for recording
          baseCircle.style('animation', 'pulse 1s infinite');
        }

        // Battery indicator
        if (d.batteryLevel !== undefined) {
          const batteryWidth = 12;
          const batteryHeight = 6;
          group.append('rect')
            .attr('x', d.size + 5)
            .attr('y', -batteryHeight/2)
            .attr('width', batteryWidth)
            .attr('height', batteryHeight)
            .attr('fill', d.batteryLevel > 20 ? '#10B981' : '#EF4444')
            .attr('stroke', '#374151')
            .attr('stroke-width', 1);
        }

        // Status icon
        group.append('text')
          .text(d.status === 'online' ? '📡' : d.status === 'recording' ? '🔴' : '🔌')
          .attr('text-anchor', 'middle')
          .attr('dy', '.35em')
          .attr('font-size', '12px');

      } else if (d.type === 'player') {
        // Player nodes with team colors
        group.append('circle')
          .attr('r', d.size)
          .attr('fill', d.color)
          .attr('stroke', d.team === 'home' ? '#1E40AF' : '#DC2626')
          .attr('stroke-width', 3);
        
        group.append('text')
          .text('👤')
          .attr('text-anchor', 'middle')
          .attr('dy', '.35em')
          .attr('font-size', '14px');

      } else if (d.type === 'eventType') {
        // Event category nodes with special shapes
        group.append('polygon')
          .attr('points', d => {
            const sides = 6;
            const radius = d.size;
            return d3.range(sides).map(i => {
              const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              return `${x},${y}`;
            }).join(' ');
          })
          .attr('fill', d.color)
          .attr('stroke', '#FFFFFF')
          .attr('stroke-width', 2);

      } else {
        // Default action nodes
        group.append('circle')
          .attr('r', d.size)
          .attr('fill', d.color)
          .attr('stroke', '#FFFFFF')
          .attr('stroke-width', 2);
      }
    });

    // Add labels with better positioning
    const labels = svg.append('g').selectAll('text')
      .data(nodes.filter(d => d.size > 15))
      .enter().append('text')
      .text((d: NetworkNode) => d.label)
      .attr('font-size', (d: NetworkNode) => Math.max(10, d.size / 3))
      .attr('dx', (d: NetworkNode) => d.size + 8)
      .attr('dy', '.35em')
      .attr('font-family', 'sans-serif')
      .attr('font-weight', 'bold')
      .attr('fill', '#1F2937')
      .attr('stroke', '#FFFFFF')
      .attr('stroke-width', 3)
      .attr('paint-order', 'stroke');

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      nodeGroup
        .attr('transform', (d: NetworkNode) => `translate(${d.x},${d.y})`);

      labels
        .attr('x', (d: NetworkNode) => d.x!)
        .attr('y', (d: NetworkNode) => d.y!);
    });

    function dragstarted(event: any, d: NetworkNode) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: NetworkNode) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: NetworkNode) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            ⚽ Match Planning Network
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <motion.div 
              className="text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div 
                className="w-16 h-16 mx-auto mb-4 border-4 border-green-500 border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              <div className="text-lg font-semibold">Loading match network...</div>
              <div className="text-sm text-gray-600">Analyzing trackers, players and connections</div>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="w-full">
        <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50">
          <CardTitle className="flex items-center gap-2 text-xl">
            ⚽ Match Planning Network
            <Badge variant="outline" className="ml-auto">
              {nodes.length} nodes • {links.length} connections
            </Badge>
          </CardTitle>
          <div className="text-sm text-gray-600">
            Interactive football match planning visualization - Click and drag nodes to explore relationships
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Legend */}
          <div className="p-4 bg-gray-50 border-b">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500"></div>
                <span>Online Tracker</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                <span>Recording</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500"></div>
                <span>Offline</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-blue-500"></div>
                <span>Assignment</span>
              </div>
            </div>
          </div>
          
          {/* Main visualization */}
          <div className="relative">
            <svg
              ref={svgRef}
              width={width}
              height={height}
              className="w-full"
              style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)' }}
            />
            
            {/* Node details panel */}
            {selectedNode && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-lg border max-w-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-lg">{selectedNode.label}</h3>
                  <button 
                    onClick={() => setSelectedNode(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
                <div className="space-y-2 text-sm">
                  <div><strong>Type:</strong> {selectedNode.type}</div>
                  <div><strong>Group:</strong> {selectedNode.group}</div>
                  {selectedNode.status && (
                    <div><strong>Status:</strong> 
                      <Badge 
                        variant={selectedNode.status === 'online' ? 'default' : 'destructive'}
                        className="ml-2"
                      >
                        {selectedNode.status}
                      </Badge>
                    </div>
                  )}
                  {selectedNode.batteryLevel !== undefined && (
                    <div><strong>Battery:</strong> {selectedNode.batteryLevel}%</div>
                  )}
                  {selectedNode.team && (
                    <div><strong>Team:</strong> {selectedNode.team}</div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
          
          <div className="p-4 text-xs text-gray-500 border-t bg-gray-50">
            💡 <strong>Tip:</strong> Drag nodes to explore connections • Click nodes for details • 
            Green = Online • Yellow = Recording • Red = Offline
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MatchPlanningNetwork;
