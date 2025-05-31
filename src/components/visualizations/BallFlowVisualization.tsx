import React, { useMemo } from 'react';
import * as d3 from 'd3';
import { BallTrackingPoint, FlowPlayerNode, Player, Team } from '@/types';

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
  if (!ballTrackingPoints || ballTrackingPoints.length === 0) {
    return <div className="text-center py-4">No ball tracking data available.</div>;
  }

  const processedNodes = useMemo(() => {
    const nodeMap = new Map<string, FlowPlayerNode>();
    
    ballTrackingPoints.forEach(point => {
      const playerId = String(point.player_id || 'unknown');
      const team = point.team || 'home';
      
      // Find player in the appropriate team
      let player: Player | undefined;
      if (team === 'home') {
        player = homeTeam.players.find(p => String(p.id) === playerId);
      } else {
        player = awayTeam.players.find(p => String(p.id) === playerId);
      }
      
      if (player) {
        const key = `${playerId}-${team}`;
        if (nodeMap.has(key)) {
          const existingNode = nodeMap.get(key)!;
          existingNode.count += 1;
        } else {
          nodeMap.set(key, {
            id: playerId,
            name: player.name,
            x: point.x,
            y: point.y,
            count: 1,
            team: team as 'home' | 'away'
          });
        }
      }
    });
    
    return Array.from(nodeMap.values());
  }, [ballTrackingPoints, homeTeam.players, awayTeam.players]);

  const processedLinks = useMemo(() => {
    const links = [];
    for (let i = 0; i < ballTrackingPoints.length - 1; i++) {
      const sourcePoint = ballTrackingPoints[i];
      const targetPoint = ballTrackingPoints[i + 1];

      if (!sourcePoint.player_id || !targetPoint.player_id) continue;

      const sourcePlayerId = String(sourcePoint.player_id);
      const targetPlayerId = String(targetPoint.player_id);

      const sourceTeam = sourcePoint.team || 'home';
      const targetTeam = targetPoint.team || 'home';

      const sourceKey = `${sourcePlayerId}-${sourceTeam}`;
      const targetKey = `${targetPlayerId}-${targetTeam}`;

      const sourceNode = processedNodes.find(node => node.id === sourcePlayerId && node.team === sourceTeam);
      const targetNode = processedNodes.find(node => node.id === targetPlayerId && node.team === targetTeam);

      if (sourceNode && targetNode) {
        links.push({
          source: sourceKey,
          target: targetKey,
          value: 1
        });
      }
    }
    return links;
  }, [ballTrackingPoints, processedNodes]);

  const width = 800;
  const height = 600;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
      <g>
        {processedLinks.map((link: any, index: number) => (
          <line
            key={`link-${index}`}
            x1={processedNodes.find(node => node.id === link.source.split('-')[0] && node.team === link.source.split('-')[1])?.x || 0}
            y1={processedNodes.find(node => node.id === link.source.split('-')[0] && node.team === link.source.split('-')[1])?.y || 0}
            x2={processedNodes.find(node => node.id === link.target.split('-')[0] && node.team === link.target.split('-')[1])?.x || 0}
            y2={processedNodes.find(node => node.id === link.target.split('-')[0] && node.team === link.target.split('-')[1])?.y || 0}
            stroke="#aaa"
            strokeWidth="2"
          />
        ))}
        {processedNodes.map((node: FlowPlayerNode) => (
          <circle
            key={node.id}
            cx={node.x}
            cy={node.y}
            r={5 + Math.sqrt(node.count)}
            fill={node.team === 'home' ? 'blue' : 'red'}
          />
        ))}
      </g>
    </svg>
  );
};

export default BallFlowVisualization;
