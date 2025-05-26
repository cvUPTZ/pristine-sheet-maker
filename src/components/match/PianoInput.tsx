import React, { useState, useEffect } from 'react';
import { EventType, Player } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  Target, 
  Flag, 
  Users, 
  AlertTriangle, 
  Zap, 
  ShieldCheck, 
  Award, 
  Circle,
  RotateCcw,
  Bookmark,
  CornerDownRight,
  Play,
  Square,
  Trophy,
  UserX,
  Shuffle,
  Crosshair,
  Eye
} from 'lucide-react';

interface PianoInputProps {
  selectedPlayer: Player | null;
  onActionSelect: (action: string) => void;
  disabled?: boolean;
}

const actionIcons: Record<EventType, string> = {
  pass: 'circle',
  shot: 'target',
  tackle: 'shield-check',
  foul: 'alert-triangle',
  corner: 'corner-down-right',
  offside: 'flag',
  goal: 'trophy',
  assist: 'users',
  yellowCard: 'bookmark',
  redCard: 'square',
  substitution: 'shuffle',
  card: 'bookmark',
  penalty: 'crosshair',
  'free-kick': 'zap',
  'goal-kick': 'circle',
  'throw-in': 'rotate-ccw',
  interception: 'eye'
};

const PianoInput: React.FC<PianoInputProps> = ({ selectedPlayer, onActionSelect, disabled = false }) => {
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [actionHistory, setActionHistory] = useState<string[]>([]);

  useEffect(() => {
    if (lastAction) {
      setActionHistory(prev => [...prev, lastAction]);
    }
  }, [lastAction]);

  const handleActionClick = (action: string) => {
    if (!disabled) {
      onActionSelect(action);
      setLastAction(action);
    }
  };

  const eventCategories = [
    {
      title: 'Basic Actions',
      events: ['pass', 'shot', 'tackle', 'foul']
    },
    {
      title: 'Set Pieces',
      events: ['corner', 'offside', 'free-kick', 'penalty', 'goal-kick', 'throw-in']
    },
    {
      title: 'Cards',
      events: ['yellowCard', 'redCard', 'card']
    },
    {
      title: 'Game Flow',
      events: ['substitution', 'interception', 'goal', 'assist']
    }
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-center">
          {selectedPlayer ? `Actions for ${selectedPlayer.name}` : 'Select a player to record actions'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {selectedPlayer ? (
          <Accordion type="multiple" className="w-full">
            {eventCategories.map(category => (
              <AccordionItem key={category.title} value={category.title}>
                <AccordionTrigger>{category.title}</AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                    {category.events.map(event => {
                      const IconComponent = actionIcons[event as EventType];
                      return (
                        <Button
                          key={event}
                          onClick={() => handleActionClick(event)}
                          variant="outline"
                          className="justify-start"
                          disabled={disabled}
                        >
                          {IconComponent && <span className="mr-2"><eval name="IconComponent" /></span>}
                          {event}
                        </Button>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            Click on a player on the pitch to start recording actions
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PianoInput;
