
import React from 'react';
import { Button } from '@/components/ui/button';
import { EventType } from '@/types';

interface ActionButtonsProps {
  onSelectAction: (action: EventType) => void;
  disabled: boolean;
}

const ACTIONS: { type: EventType; label: string }[] = [
  { type: 'shot', label: 'Shot' },
  { type: 'goal', label: 'Goal' },
  { type: 'pass', label: 'Pass' },
  { type: 'foul', label: 'Foul' },
  { type: 'card', label: 'Card' },
  { type: 'corner', label: 'Corner' },
  { type: 'offside', label: 'Offside' },
  { type: 'penalty', label: 'Penalty' },
  { type: 'free-kick', label: 'Free Kick' },
  { type: 'goal-kick', label: 'Goal Kick' },
  { type: 'throw-in', label: 'Throw In' },
];

const ActionButtons: React.FC<ActionButtonsProps> = ({ onSelectAction, disabled }) => {
  return (
    <div className="grid grid-cols-3 gap-2">
      {ACTIONS.map((action) => (
        <Button
          key={action.type}
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onSelectAction(action.type)}
          className="h-10"
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
};

export default ActionButtons;
