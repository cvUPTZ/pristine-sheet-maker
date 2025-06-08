// src/components/analytics/ShotMap.tsx
import React, { useState } from 'react';
import { MatchEvent } from '@/types';
import { ShotEventData } from '@/types/eventData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Define pitch dimensions (can be props or constants)
const DEFAULT_PITCH_LENGTH = 105;
const DEFAULT_PITCH_WIDTH = 68;
// Define SVG viewbox dimensions for responsiveness
const SVG_VIEWBOX_WIDTH = DEFAULT_PITCH_LENGTH + 10; // Add padding
const SVG_VIEWBOX_HEIGHT = DEFAULT_PITCH_WIDTH + 10; // Add padding

interface ShotMapProps {
  shots: MatchEvent[]; // Already filtered for event.type === 'shot'
  homeTeamName?: string;
  awayTeamName?: string;
  pitchLength?: number;
  pitchWidth?: number;
}

const ShotMap: React.FC<ShotMapProps> = ({
  shots,
  homeTeamName = 'Home',
  awayTeamName = 'Away',
  pitchLength = DEFAULT_PITCH_LENGTH,
  pitchWidth = DEFAULT_PITCH_WIDTH,
}) => {
  const [filterTeam, setFilterTeam] = useState<'all' | 'home' | 'away'>('all');
  // TODO: Add player filter if player data is available on shots

  const filteredShots = shots.filter(shot => {
    if (filterTeam === 'all') return true;
    return shot.team === filterTeam;
  });

  const getShotColor = (shot: MatchEvent): string => {
    const data = shot.event_data as ShotEventData;
    if (data?.is_goal) return 'rgba(0, 255, 0, 0.9)'; // Bright Green for Goal
    if (data?.on_target) return 'rgba(255, 165, 0, 0.8)'; // Orange for Saved/On Target
    return 'rgba(255, 0, 0, 0.7)'; // Red for Off-target or Blocked
  };

  const getShotRadius = (shot: MatchEvent): number => {
    const data = shot.event_data as ShotEventData;
    const xg = data?.xg_value || 0.01;
    return 1.5 + (xg * 5); // Scale radius: min 1.5, max 6.5
  };

  // Transform shot coordinates from pitch system to SVG viewbox system
  // Assuming (0,0) is top-left for SVG, but pitch coordinates might be (0,0) at a corner.
  // Let's assume standard attacking direction: left-to-right (towards increasing X).
  // Padding of 5 is added on all sides of the SVG viewbox.
  const transformX = (x: number) => 5 + x;
  const transformY = (y: number) => 5 + y;

  // Goal dimensions (approximate, for visual representation)
  const goalHeight = 7.32 * (pitchWidth / 68); // Scale goal height to pitch width
  const goalYTop = 5 + (pitchWidth / 2) - (goalHeight / 2);


  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Shot Map</CardTitle>
          <div className="flex items-center space-x-2">
            <Select value={filterTeam} onValueChange={(value) => setFilterTeam(value as 'all' | 'home' | 'away')}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                <SelectItem value="home">{homeTeamName}</SelectItem>
                <SelectItem value="away">{awayTeamName}</SelectItem>
              </SelectContent>
            </Select>
            {/* TODO: Player filter dropdown */}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div style={{ width: '100%', aspectRatio: `${SVG_VIEWBOX_WIDTH} / ${SVG_VIEWBOX_HEIGHT}` }}>
            <svg
              viewBox={`0 0 ${SVG_VIEWBOX_WIDTH} ${SVG_VIEWBOX_HEIGHT}`}
              preserveAspectRatio="xMidYMid meet"
              style={{ border: '1px solid #e2e8f0', backgroundColor: '#f9fafb' }}
            >
              {/* Pitch Background */}
              <rect x="5" y="5" width={pitchLength} height={pitchWidth} fill="#38A169" stroke="#A0AEC0" strokeWidth="0.2" />

              {/* Center Line */}
              <line x1={5 + pitchLength / 2} y1="5" x2={5 + pitchLength / 2} y2={5 + pitchWidth} stroke="#A0AEC0" strokeWidth="0.2" />
              {/* Center Circle */}
              <circle cx={5 + pitchLength / 2} cy={5 + pitchWidth / 2} r={pitchWidth / 7} stroke="#A0AEC0" strokeWidth="0.2" fill="none" />
              <circle cx={5 + pitchLength / 2} cy={5 + pitchWidth / 2} r="0.5" fill="#A0AEC0" />

              {/* Penalty Areas */}
              {/* Home (left) */}
              <rect x="5" y={5 + (pitchWidth - 40.32) / 2} width="16.5" height="40.32" stroke="#A0AEC0" strokeWidth="0.2" fill="none" />
              <rect x="5" y={5 + (pitchWidth - 18.32) / 2} width="5.5" height="18.32" stroke="#A0AEC0" strokeWidth="0.2" fill="none" />
              <circle cx={5 + 11} cy={5 + pitchWidth / 2} r="0.5" fill="#A0AEC0" /> {/* Penalty spot */}

              {/* Away (right) */}
              <rect x={5 + pitchLength - 16.5} y={5 + (pitchWidth - 40.32) / 2} width="16.5" height="40.32" stroke="#A0AEC0" strokeWidth="0.2" fill="none" />
              <rect x={5 + pitchLength - 5.5} y={5 + (pitchWidth - 18.32) / 2} width="5.5" height="18.32" stroke="#A0AEC0" strokeWidth="0.2" fill="none" />
              <circle cx={5 + pitchLength - 11} cy={5 + pitchWidth / 2} r="0.5" fill="#A0AEC0" /> {/* Penalty spot */}

              {/* Goals */}
              {/* Home (left) */}
              <rect x={5 - 1.5} y={goalYTop} width="1.5" height={goalHeight} fill="#E2E8F0" stroke="#A0AEC0" strokeWidth="0.2" />
              {/* Away (right) */}
              <rect x={5 + pitchLength} y={goalYTop} width="1.5" height={goalHeight} fill="#E2E8F0" stroke="#A0AEC0" strokeWidth="0.2" />

              {/* Render Shots */}
              {filteredShots.map((shot) => {
                if (!shot.coordinates || typeof shot.coordinates.x !== 'number' || typeof shot.coordinates.y !== 'number') return null;

                // Assuming coordinates are for a standard pitch (0-105, 0-68)
                // If team is 'away', assume they are shooting towards left goal (x=0)
                // If team is 'home', assume they are shooting towards right goal (x=pitchLength)
                // This standardizes all shots as if attacking towards the right for visualization.
                let displayX = shot.coordinates.x;
                let displayY = shot.coordinates.y;

                if (shot.team === 'away') {
                  // Flip coordinates for away team to show all shots attacking one direction (e.g. right)
                  displayX = pitchLength - shot.coordinates.x;
                  displayY = pitchWidth - shot.coordinates.y; // Also flip Y if teams switch ends and maintain player perspective
                }

                const shotX = transformX(displayX);
                const shotY = transformY(displayY);
                const data = shot.event_data as ShotEventData | undefined; // Can be null or not ShotEventData

                return (
                  <Tooltip key={shot.id}>
                    <TooltipTrigger asChild>
                      <circle
                        cx={shotX}
                        cy={shotY}
                        r={getShotRadius(shot)}
                        fill={getShotColor(shot)}
                        stroke="#333"
                        strokeWidth="0.3"
                        opacity="0.85"
                        style={{ cursor: 'pointer' }}
                      />
                    </TooltipTrigger>
                    <TooltipContent className="bg-background border shadow-lg p-3 rounded-md">
                      <p className="font-semibold">Player: {shot.player?.name || `ID ${shot.player_id || 'N/A'}`}</p>
                      <p>Team: {shot.team === 'home' ? homeTeamName : awayTeamName}</p>
                      <hr className="my-1" />
                      <p>Outcome: {data?.is_goal ? 'Goal!' : data?.on_target ? 'On Target' : 'Off Target/Blocked'}</p>
                      {data?.xg_value !== undefined && <p>xG: {data.xg_value.toFixed(2)}</p>}
                      {data?.body_part_used && <p>Body Part: {data.body_part_used}</p>}
                      {data?.situation && <p>Situation: {data.situation}</p>}
                      {data?.assist_type && <p>Assist: {data.assist_type}</p>}
                      {data?.shot_type && <p>Shot Type: {data.shot_type}</p>}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </svg>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
};

export default ShotMap;
