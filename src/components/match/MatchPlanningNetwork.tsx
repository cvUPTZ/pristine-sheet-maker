
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { EVENT_TYPE_CATEGORIES } from '@/constants/eventTypes';

interface NetworkNode extends d3.SimulationNodeDatum {
  id: string;
  type: 'tracker' | 'player' | 'eventType' | 'action' | 'replacement';
  label: string;
  group: string;
  size: number;
  data?: any;
  color?: string;
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

      // Create mock tracker status data since the table doesn't exist yet
      const trackerStatus = assignments?.map(assignment => ({
        tracker_id: assignment.tracker_user_id,
        status: Math.random() > 0.3 ? 'online' : 'offline',
        battery_level: Math.floor(Math.random() * 100)
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
    const nodeMap = new Map<string, NetworkNode>();

    // Create central match node
    const matchNode: NetworkNode = {
      id: `match-${matchId}`,
      type: 'action',
      label: matchData.name || 'Match',
      group: 'match',
      size: 30,
      color: '#8B5CF6'
    };
    nodes.push(matchNode);
    nodeMap.set(matchNode.id, matchNode);

    // Create tracker nodes
    const trackerMap = new Map<string, any>();
    assignments.forEach(assignment => {
      if (assignment.tracker_user_id && !trackerMap.has(assignment.tracker_user_id)) {
        trackerMap.set(assignment.tracker_user_id, assignment);
        
        const status = trackerStatus.find(s => s.tracker_id === assignment.tracker_user_id);
        const isOnline = status?.status === 'online';
        
        const trackerNode: NetworkNode = {
          id: `tracker-${assignment.tracker_user_id}`,
          type: 'tracker',
          label: assignment.tracker_email || `Tracker ${assignment.tracker_user_id.substring(0, 8)}`,
          group: 'tracker',
          size: 20,
          color: isOnline ? '#10B981' : '#EF4444',
          data: { ...assignment, status }
        };
        nodes.push(trackerNode);
        nodeMap.set(trackerNode.id, trackerNode);

        // Link tracker to match
        links.push({
          source: trackerNode.id,
          target: matchNode.id,
          type: 'assignment',
          strength: 1
        });
      }
    });

    // Create player nodes
    const playerMap = new Map<string, any>();
    assignments.forEach(assignment => {
      if (assignment.player_id && !playerMap.has(assignment.player_id)) {
        playerMap.set(assignment.player_id, assignment);
        
        const playerNode: NetworkNode = {
          id: `player-${assignment.player_id}`,
          type: 'player',
          label: assignment.player_name || `Player ${assignment.player_id}`,
          group: assignment.player_team_id || 'unknown',
          size: 15,
          color: assignment.player_team_id === 'home' ? '#3B82F6' : '#EF4444',
          data: assignment
        };
        nodes.push(playerNode);
        nodeMap.set(playerNode.id, playerNode);

        // Link player to their assigned tracker
        if (assignment.tracker_user_id) {
          links.push({
            source: `tracker-${assignment.tracker_user_id}`,
            target: playerNode.id,
            type: 'assignment',
            strength: 0.8
          });
        }
      }
    });

    // Create event type nodes
    EVENT_TYPE_CATEGORIES.forEach(category => {
      const categoryNode: NetworkNode = {
        id: `category-${category.key}`,
        type: 'eventType',
        label: category.label,
        group: 'eventType',
        size: 18,
        color: category.color,
        data: category
      };
      nodes.push(categoryNode);
      nodeMap.set(categoryNode.id, categoryNode);

      // Link to match
      links.push({
        source: categoryNode.id,
        target: matchNode.id,
        type: 'capability',
        strength: 0.3
      });

      // Create individual event type nodes
      category.events.forEach(event => {
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
        nodeMap.set(eventNode.id, eventNode);

        // Link to category
        links.push({
          source: eventNode.id,
          target: categoryNode.id,
          type: 'capability',
          strength: 0.5
        });

        // Link to trackers who are assigned to track this event type
        assignments.forEach(assignment => {
          if (assignment.assigned_event_types?.includes(event.key)) {
            links.push({
              source: `tracker-${assignment.tracker_user_id}`,
              target: eventNode.id,
              type: 'assignment',
              strength: 0.6
            });
          }
        });
      });
    });

    // Create replacement connections
    trackerStatus.forEach(status => {
      if (status.status === 'offline' || status.battery_level < 20) {
        const offlineTracker = nodeMap.get(`tracker-${status.tracker_id}`);
        if (offlineTracker) {
          // Find potential replacements (online trackers)
          trackerStatus.forEach(potentialReplacement => {
            if (potentialReplacement.status === 'online' && 
                potentialReplacement.tracker_id !== status.tracker_id &&
                potentialReplacement.battery_level > 50) {
              
              const replacementNode = nodeMap.get(`tracker-${potentialReplacement.tracker_id}`);
              if (replacementNode) {
                links.push({
                  source: replacementNode.id,
                  target: offlineTracker.id,
                  type: 'replacement',
                  strength: 0.4
                });
              }
            }
          });
        }
      }
    });

    return { nodes, links };
  };

  const createVisualization = () => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).strength(d => (d as NetworkLink).strength))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d: any) => (d as NetworkNode).size + 5));

    // Create arrow markers for directed links
    svg.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .append('path')
      .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
      .attr('fill', '#999')
      .style('stroke', 'none');

    // Create links
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
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.sqrt(d.strength * 3))
      .attr('stroke-dasharray', d => d.type === 'replacement' ? '5,5' : null)
      .attr('marker-end', d => d.type === 'replacement' ? 'url(#arrowhead)' : null);

    // Create nodes
    const node = svg.append('g')
      .selectAll('circle')
      .data(nodes)
      .enter().append('circle')
      .attr('r', (d: NetworkNode) => d.size)
      .attr('fill', (d: NetworkNode) => d.color || '#6B7280')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .call(
        d3.drag<SVGCircleElement, NetworkNode>()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended)
      );

    // Add labels
    const label = svg.append('g')
      .selectAll('text')
      .data(nodes)
      .enter().append('text')
      .text((d: NetworkNode) => d.label)
      .attr('font-size', (d: NetworkNode) => Math.max(8, d.size / 2))
      .attr('dx', (d: NetworkNode) => d.size + 5)
      .attr('dy', '.35em')
      .attr('font-family', 'sans-serif')
      .attr('fill', '#374151');

    // Add tooltips
    node.append('title')
      .text((d: NetworkNode) => {
        let tooltip = `${d.label} (${d.type})`;
        if (d.data?.status) {
          tooltip += `\nStatus: ${d.data.status}`;
        }
        if (d.data?.battery_level) {
          tooltip += `\nBattery: ${d.data.battery_level}%`;
        }
        return tooltip;
      });

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node
        .attr('cx', (d: NetworkNode) => d.x!)
        .attr('cy', (d: NetworkNode) => d.y!);

      label
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
      <Card>
        <CardHeader>
          <CardTitle>Match Planning Network</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-sm">Loading network visualization...</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Match Planning Network</CardTitle>
        <div className="text-sm text-gray-600">
          Interactive visualization of trackers, players, event types, and their relationships
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>Assignment</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Capability</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-1 bg-yellow-500"></div>
              <span>Replacement</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span>Collaboration</span>
            </div>
          </div>
        </div>
        <svg
          ref={svgRef}
          width={width}
          height={height}
          className="border rounded"
        />
        <div className="mt-2 text-xs text-gray-500">
          Drag nodes to explore connections. Hover for details.
        </div>
      </CardContent>
    </Card>
  );
};

export default MatchPlanningNetwork;
