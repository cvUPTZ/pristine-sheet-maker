import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';

interface PlanningData {
  match: any;
  assignments: any[];
  homeTeamPlayers: any[];
  awayTeamPlayers: any[];
  trackers: any[];
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
  const [planningData, setPlanningData] = useState<PlanningData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedElement, setSelectedElement] = useState<any>(null);

  useEffect(() => {
    fetchPlanningData();
  }, [matchId]);

  const fetchPlanningData = async () => {
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

      if (matchData && assignments) {
        // Group players by team
        const homeTeamPlayers = assignments.filter(a => a.player_team_id === 'home');
        const awayTeamPlayers = assignments.filter(a => a.player_team_id === 'away');
        
        // Get unique trackers
        const trackers = assignments
          .filter(a => a.tracker_user_id)
          .reduce((acc, assignment) => {
            const existing = acc.find(t => t.id === assignment.tracker_user_id);
            if (!existing) {
              acc.push({
                id: assignment.tracker_user_id,
                email: assignment.tracker_email,
                assignedPlayers: assignments.filter(a => a.tracker_user_id === assignment.tracker_user_id).length,
                status: Math.random() > 0.3 ? 'ready' : 'pending'
              });
            }
            return acc;
          }, []);

        setPlanningData({
          match: matchData,
          assignments: assignments || [],
          homeTeamPlayers,
          awayTeamPlayers,
          trackers
        });
        
        createVisualization({
          match: matchData,
          assignments: assignments || [],
          homeTeamPlayers,
          awayTeamPlayers,
          trackers
        });
      }
    } catch (error) {
      console.error('Error fetching planning data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createVisualization = (data: PlanningData) => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Create football pitch background
    const pitchGroup = svg.append('g').attr('class', 'pitch');
    
    // Pitch dimensions (scaled to fit container)
    const pitchWidth = width * 0.8;
    const pitchHeight = height * 0.7;
    const pitchX = (width - pitchWidth) / 2;
    const pitchY = (height - pitchHeight) / 2;

    // Draw pitch
    pitchGroup.append('rect')
      .attr('x', pitchX)
      .attr('y', pitchY)
      .attr('width', pitchWidth)
      .attr('height', pitchHeight)
      .attr('fill', '#2D5A27')
      .attr('stroke', '#FFFFFF')
      .attr('stroke-width', 3)
      .attr('rx', 10);

    // Center circle
    pitchGroup.append('circle')
      .attr('cx', width / 2)
      .attr('cy', height / 2)
      .attr('r', 50)
      .attr('fill', 'none')
      .attr('stroke', '#FFFFFF')
      .attr('stroke-width', 2);

    // Center line
    pitchGroup.append('line')
      .attr('x1', width / 2)
      .attr('y1', pitchY)
      .attr('x2', width / 2)
      .attr('y2', pitchY + pitchHeight)
      .attr('stroke', '#FFFFFF')
      .attr('stroke-width', 2);

    // Goal areas
    const goalWidth = pitchWidth * 0.15;
    const goalHeight = pitchHeight * 0.4;
    const goalY = pitchY + (pitchHeight - goalHeight) / 2;

    // Home goal (left)
    pitchGroup.append('rect')
      .attr('x', pitchX)
      .attr('y', goalY)
      .attr('width', goalWidth)
      .attr('height', goalHeight)
      .attr('fill', 'none')
      .attr('stroke', '#FFFFFF')
      .attr('stroke-width', 2);

    // Away goal (right)
    pitchGroup.append('rect')
      .attr('x', pitchX + pitchWidth - goalWidth)
      .attr('y', goalY)
      .attr('width', goalWidth)
      .attr('height', goalHeight)
      .attr('fill', 'none')
      .attr('stroke', '#FFFFFF')
      .attr('stroke-width', 2);

    // Position players based on formation
    const homeFormation = data.match.home_team_formation || '4-4-2';
    const awayFormation = data.match.away_team_formation || '4-3-3';

    // Draw home team formation
    drawTeamFormation(svg, data.homeTeamPlayers, homeFormation, 'home', pitchX, pitchY, pitchWidth, pitchHeight);
    
    // Draw away team formation
    drawTeamFormation(svg, data.awayTeamPlayers, awayFormation, 'away', pitchX, pitchY, pitchWidth, pitchHeight);

    // Draw tracker assignment connections
    drawTrackerConnections(svg, data.assignments, pitchX, pitchY, pitchWidth, pitchHeight);

    // Add planning dashboard
    drawPlanningDashboard(svg, data, width, height);
  };

  const drawTeamFormation = (svg: any, players: any[], formation: string, team: 'home' | 'away', pitchX: number, pitchY: number, pitchWidth: number, pitchHeight: number) => {
    const formationNumbers = formation.split('-').map(Number);
    const totalPlayers = Math.min(players.length, 11);
    
    const teamGroup = svg.append('g').attr('class', `team-${team}`);
    const isHome = team === 'home';
    const teamColor = isHome ? '#3B82F6' : '#EF4444';
    const startX = isHome ? pitchX + pitchWidth * 0.1 : pitchX + pitchWidth * 0.9;

    let playerIndex = 0;
    
    // Goalkeeper
    if (totalPlayers > 0) {
      const gkX = isHome ? pitchX + 30 : pitchX + pitchWidth - 30;
      const gkY = pitchY + pitchHeight / 2;
      
      drawPlayer(teamGroup, players[playerIndex] || { player_name: 'GK', jersey_number: 1 }, gkX, gkY, teamColor, 'GK');
      playerIndex++;
    }

    // Position outfield players according to formation
    let currentY = pitchY + pitchHeight * 0.15;
    const sectionHeight = pitchHeight * 0.7 / formationNumbers.length;

    formationNumbers.forEach((playersInLine, lineIndex) => {
      for (let i = 0; i < playersInLine && playerIndex < totalPlayers; i++) {
        const lineY = currentY + sectionHeight / 2;
        const spacing = pitchWidth * 0.6 / (playersInLine + 1);
        const playerX = isHome ? 
          pitchX + pitchWidth * 0.2 + spacing * (i + 1) :
          pitchX + pitchWidth * 0.8 - spacing * (i + 1);
        
        const player = players[playerIndex] || { player_name: `P${playerIndex + 1}`, jersey_number: playerIndex + 1 };
        drawPlayer(teamGroup, player, playerX, lineY, teamColor, getPositionAbbr(lineIndex, formationNumbers.length));
        playerIndex++;
      }
      currentY += sectionHeight;
    });
  };

  const drawPlayer = (group: any, player: any, x: number, y: number, color: string, position: string) => {
    const playerGroup = group.append('g')
      .attr('class', 'player')
      .style('cursor', 'pointer')
      .on('click', () => setSelectedElement({ type: 'player', data: player, position }));

    // Player circle
    playerGroup.append('circle')
      .attr('cx', x)
      .attr('cy', y)
      .attr('r', 15)
      .attr('fill', color)
      .attr('stroke', '#FFFFFF')
      .attr('stroke-width', 2);

    // Jersey number
    playerGroup.append('text')
      .attr('x', x)
      .attr('y', y + 4)
      .attr('text-anchor', 'middle')
      .attr('fill', '#FFFFFF')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text(player.jersey_number || '?');

    // Player name
    playerGroup.append('text')
      .attr('x', x)
      .attr('y', y + 30)
      .attr('text-anchor', 'middle')
      .attr('fill', '#FFFFFF')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('stroke', '#000000')
      .attr('stroke-width', 1)
      .attr('paint-order', 'stroke')
      .text(player.player_name?.split(' ').pop() || 'Unknown');

    // Position indicator
    playerGroup.append('text')
      .attr('x', x)
      .attr('y', y - 20)
      .attr('text-anchor', 'middle')
      .attr('fill', '#FFD700')
      .attr('font-size', '8px')
      .attr('font-weight', 'bold')
      .text(position);
  };

  const drawTrackerConnections = (svg: any, assignments: any[], pitchX: number, pitchY: number, pitchWidth: number, pitchHeight: number) => {
    // This would show which tracker is assigned to which players
    // For now, we'll add some visual indicators
    const connectionsGroup = svg.append('g').attr('class', 'tracker-connections');
    
    // Add tracker status indicators around the pitch
    const trackers = assignments.reduce((acc, assignment) => {
      if (assignment.tracker_user_id && !acc.find(t => t.id === assignment.tracker_user_id)) {
        acc.push({
          id: assignment.tracker_user_id,
          email: assignment.tracker_email,
          count: assignments.filter(a => a.tracker_user_id === assignment.tracker_user_id).length
        });
      }
      return acc;
    }, []);

    trackers.forEach((tracker, index) => {
      const angle = (index / trackers.length) * 2 * Math.PI;
      const radius = Math.min(pitchWidth, pitchHeight) * 0.6;
      const x = pitchX + pitchWidth / 2 + Math.cos(angle) * radius;
      const y = pitchY + pitchHeight / 2 + Math.sin(angle) * radius;

      const trackerGroup = connectionsGroup.append('g')
        .style('cursor', 'pointer')
        .on('click', () => setSelectedElement({ type: 'tracker', data: tracker }));

      // Tracker indicator
      trackerGroup.append('circle')
        .attr('cx', x)
        .attr('cy', y)
        .attr('r', 20)
        .attr('fill', '#10B981')
        .attr('stroke', '#FFFFFF')
        .attr('stroke-width', 2);

      trackerGroup.append('text')
        .attr('x', x)
        .attr('y', y + 4)
        .attr('text-anchor', 'middle')
        .attr('fill', '#FFFFFF')
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .text('📱');

      // Assigned players count
      trackerGroup.append('circle')
        .attr('cx', x + 15)
        .attr('cy', y - 15)
        .attr('r', 8)
        .attr('fill', '#F59E0B');

      trackerGroup.append('text')
        .attr('x', x + 15)
        .attr('y', y - 11)
        .attr('text-anchor', 'middle')
        .attr('fill', '#FFFFFF')
        .attr('font-size', '10px')
        .attr('font-weight', 'bold')
        .text(tracker.count);
    });
  };

  const drawPlanningDashboard = (svg: any, data: PlanningData, width: number, height: number) => {
    // Add team names and formations at the top
    const headerGroup = svg.append('g').attr('class', 'header');
    
    // Home team info
    headerGroup.append('text')
      .attr('x', width * 0.25)
      .attr('y', 30)
      .attr('text-anchor', 'middle')
      .attr('fill', '#3B82F6')
      .attr('font-size', '18px')
      .attr('font-weight', 'bold')
      .text(`${data.match.home_team_name || 'Home Team'} (${data.match.home_team_formation || '4-4-2'})`);

    // VS
    headerGroup.append('text')
      .attr('x', width / 2)
      .attr('y', 30)
      .attr('text-anchor', 'middle')
      .attr('fill', '#FFFFFF')
      .attr('font-size', '16px')
      .attr('font-weight', 'bold')
      .text('VS');

    // Away team info
    headerGroup.append('text')
      .attr('x', width * 0.75)
      .attr('y', 30)
      .attr('text-anchor', 'middle')
      .attr('fill', '#EF4444')
      .attr('font-size', '18px')
      .attr('font-weight', 'bold')
      .text(`${data.match.away_team_name || 'Away Team'} (${data.match.away_team_formation || '4-3-3'})`);
  };

  const getPositionAbbr = (lineIndex: number, totalLines: number): string => {
    if (lineIndex === 0) return 'DEF';
    if (lineIndex === totalLines - 1) return 'ATT';
    return 'MID';
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            ⚽ Match Planning Visualization
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
              <div className="text-lg font-semibold">Loading match planning...</div>
              <div className="text-sm text-gray-600">Preparing tactical setup</div>
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
            ⚽ Match Planning & Formation Setup
            {planningData && (
              <Badge variant="outline" className="ml-auto">
                {planningData.homeTeamPlayers.length + planningData.awayTeamPlayers.length} players • {planningData.trackers.length} trackers
              </Badge>
            )}
          </CardTitle>
          <div className="text-sm text-gray-600">
            Tactical formation overview with tracker assignments - Click players and trackers for details
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Planning Stats */}
          {planningData && (
            <div className="p-4 bg-gray-50 border-b">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{planningData.homeTeamPlayers.length}</div>
                  <div className="text-gray-600">Home Players</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{planningData.awayTeamPlayers.length}</div>
                  <div className="text-gray-600">Away Players</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{planningData.trackers.length}</div>
                  <div className="text-gray-600">Assigned Trackers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{planningData.assignments.length}</div>
                  <div className="text-gray-600">Total Assignments</div>
                </div>
              </div>
            </div>
          )}
          
          {/* Main visualization */}
          <div className="relative bg-gradient-to-b from-green-800 to-green-900">
            <svg
              ref={svgRef}
              width={width}
              height={height}
              className="w-full"
            />
            
            {/* Details panel */}
            {selectedElement && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-lg border max-w-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-lg">
                    {selectedElement.type === 'player' ? 'Player Details' : 'Tracker Details'}
                  </h3>
                  <button 
                    onClick={() => setSelectedElement(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
                <div className="space-y-2 text-sm">
                  {selectedElement.type === 'player' ? (
                    <>
                      <div><strong>Name:</strong> {selectedElement.data.player_name || 'Unknown'}</div>
                      <div><strong>Jersey:</strong> #{selectedElement.data.jersey_number || '?'}</div>
                      <div><strong>Position:</strong> {selectedElement.position}</div>
                      <div><strong>Team:</strong> {selectedElement.data.player_team_id || 'Unknown'}</div>
                    </>
                  ) : (
                    <>
                      <div><strong>Tracker:</strong> {selectedElement.data.email}</div>
                      <div><strong>Assigned Players:</strong> {selectedElement.data.count}</div>
                      <div><strong>Status:</strong> 
                        <Badge className="ml-2" variant="default">
                          Ready
                        </Badge>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </div>
          
          <div className="p-4 text-xs text-gray-500 border-t bg-gray-50">
            💡 <strong>Planning Overview:</strong> Formation-based player positioning • 
            Tracker assignments (📱) • Click elements for details • 
            Blue = Home Team • Red = Away Team
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MatchPlanningNetwork;
