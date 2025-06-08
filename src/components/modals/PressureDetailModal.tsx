import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PressureEventData } from '@/types/eventData';
import { PlayerForPianoInput } from '../TrackerPianoInput'; // Assuming PlayerForPianoInput is exported
import { useToast } from '@/hooks/use-toast';

interface PressureDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (details: PressureEventData) => void;
  initialDetails: Partial<PressureEventData>;
  pressurer: PlayerForPianoInput | null;
  // opponentPlayers?: PlayerForPianoInput[]; // Optional for V1
}

const PressureDetailModal: React.FC<PressureDetailModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialDetails,
  pressurer,
  // opponentPlayers = [], // Optional for V1
}) => {
  const { toast } = useToast();
  const [outcome, setOutcome] = useState<string>(initialDetails.outcome || 'no_effect');
  // const [targetPlayerId, setTargetPlayerId] = useState<string | number | undefined>(initialDetails.target_player_id); // Optional V1
  // const [pressureType, setPressureType] = useState<string | undefined>(initialDetails.pressure_type); // Optional V1

  useEffect(() => {
    if (isOpen) {
      setOutcome(initialDetails.outcome || 'no_effect');
      // setTargetPlayerId(initialDetails.target_player_id);
      // setPressureType(initialDetails.pressure_type);
    }
  }, [isOpen, initialDetails]);

  const handleSubmit = () => {
    if (!outcome) { // Should always have a default, but good practice
      toast({
        title: "Outcome Required",
        description: "Please select the outcome of the pressure.",
        variant: "destructive",
      });
      return;
    }
    onSubmit({
      outcome: outcome as PressureEventData['outcome'], // Cast to the specific literal types
      // target_player_id: targetPlayerId, // Optional V1
      // pressure_type: pressureType as PressureEventData['pressure_type'], // Optional V1
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Pressure Event Details (By: {pressurer?.name || 'Selected Player'})</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="outcome" className="text-right">Outcome*</Label>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select pressure outcome" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no_effect">No Significant Effect</SelectItem>
                <SelectItem value="regain_possession">Regain Possession</SelectItem>
                <SelectItem value="forced_turnover_error">Forced Turnover (Opponent Error)</SelectItem>
                <SelectItem value="forced_pass_backwards">Forced Pass Backwards/Sideways</SelectItem>
                <SelectItem value="foul_won">Foul Won (by Pressurer)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Optional V1 Fields - Uncomment to implement
          {opponentPlayers && opponentPlayers.length > 0 && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="targetPlayer" className="text-right">Target Player</Label>
              <Select value={targetPlayerId ? String(targetPlayerId) : undefined} onValueChange={setTargetPlayerId}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select target player (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {opponentPlayers.map(player => (
                    <SelectItem key={player.id} value={String(player.id)}>
                      {player.name} (#{player.jersey_number || player.number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="pressureType" className="text-right">Pressure Type</Label>
            <Select value={pressureType} onValueChange={setPressureType}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select pressure type (optional)" />
              </SelectTrigger>
              <SelectContent>
                 <SelectItem value="direct_on_ball">Direct on Ball Carrier</SelectItem>
                 <SelectItem value="closing_lane">Closing Down Passing Lane</SelectItem>
                 <SelectItem value="counter_pressure">Counter-Pressure</SelectItem>
              </SelectContent>
            </Select>
          </div>
          */}

        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          </DialogClose>
          <Button type="button" onClick={handleSubmit}>Record Pressure</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PressureDetailModal;
