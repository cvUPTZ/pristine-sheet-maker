
import React from 'react';
import { useSpecializedAssignments } from './hooks/useSpecializedAssignments';
import SpecializedAssignmentForm from './components/SpecializedAssignmentForm';
import AssignmentMatrix from './components/AssignmentMatrix';

interface SpecializedTrackerAssignmentProps {
  matchId: string;
  homeTeamPlayers: any[];
  awayTeamPlayers: any[];
}

const SpecializedTrackerAssignment: React.FC<SpecializedTrackerAssignmentProps> = ({
  matchId,
  homeTeamPlayers,
  awayTeamPlayers
}) => {
  const {
    trackerUsers,
    assignments,
    loading,
    createAssignment,
    deleteAssignment
  } = useSpecializedAssignments(matchId);

  return (
    <div className="space-y-6">
      <SpecializedAssignmentForm
        trackerUsers={trackerUsers}
        homeTeamPlayers={homeTeamPlayers}
        awayTeamPlayers={awayTeamPlayers}
        assignments={assignments}
        loading={loading}
        onCreateAssignment={createAssignment}
      />
      
      <AssignmentMatrix
        homeTeamPlayers={homeTeamPlayers}
        awayTeamPlayers={awayTeamPlayers}
        assignments={assignments}
        onDeleteAssignment={deleteAssignment}
      />
    </div>
  );
};

export default SpecializedTrackerAssignment;
