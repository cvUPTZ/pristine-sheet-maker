import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShotEventData } from '@/types/eventData';

interface ShotDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (details: ShotEventData) => void;
  initialDetails: Partial<ShotEventData>;
}

const ShotDetailModal: React.FC<ShotDetailModalProps> = ({ isOpen, onClose, onSubmit, initialDetails }) => {
  const [onTarget, setOnTarget] = useState<boolean>(initialDetails.on_target || false);
  const [bodyPartUsed, setBodyPartUsed] = useState<'right_foot' | 'left_foot' | 'head' | 'other' | string>(initialDetails.body_part_used || 'right_foot');
  const [shotType, setShotType] = useState<'normal' | 'volley' | 'half_volley' | 'header' | 'lob' | 'penalty' | string>(initialDetails.shot_type || 'normal');
  const [situation, setSituation] = useState<'open_play' | 'fast_break' | 'corner_related' | 'direct_free_kick' | 'penalty' | string>(initialDetails.situation || 'open_play');
  const [assistType, setAssistType] = useState<'none' | 'pass' | 'cross' | 'through_ball' | 'set_piece_assist' | 'rebound' | string>(initialDetails.assist_type || 'none');
  const [isGoal, setIsGoal] = useState<boolean>(initialDetails.is_goal || false);


  useEffect(() => {
    if (isOpen) {
      setOnTarget(initialDetails.on_target || false);
      setBodyPartUsed(initialDetails.body_part_used || 'right_foot');
      setShotType(initialDetails.shot_type || 'normal');
      setSituation(initialDetails.situation || 'open_play');
      setAssistType(initialDetails.assist_type || 'none');
      setIsGoal(initialDetails.is_goal || false);
    }
  }, [isOpen, initialDetails]);

  const handleSubmit = () => {
    onSubmit({
      on_target: onTarget,
      body_part_used: bodyPartUsed as ShotEventData['body_part_used'],
      shot_type: shotType as ShotEventData['shot_type'],
      situation: situation as ShotEventData['situation'],
      assist_type: assistType as ShotEventData['assist_type'],
      is_goal: isGoal,
      // xg_value can be added later if needed
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Enter Shot Details</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center space-x-2">
            <Checkbox id="onTarget" checked={onTarget} onCheckedChange={(checked) => setOnTarget(Boolean(checked))} />
            <Label htmlFor="onTarget">On Target?</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="isGoal" checked={isGoal} onCheckedChange={(checked) => setIsGoal(Boolean(checked))} />
            <Label htmlFor="isGoal">Goal Scored?</Label>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="bodyPartUsed" className="text-right">Body Part</Label>
            <Select value={bodyPartUsed} onValueChange={setBodyPartUsed}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select body part" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="right_foot">Right Foot</SelectItem>
                <SelectItem value="left_foot">Left Foot</SelectItem>
                <SelectItem value="head">Head</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="shotType" className="text-right">Shot Type</Label>
            <Select value={shotType} onValueChange={setShotType}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select shot type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="volley">Volley</SelectItem>
                <SelectItem value="half_volley">Half-Volley</SelectItem>
                <SelectItem value="header">Header</SelectItem>
                <SelectItem value="lob">Lob</SelectItem>
                <SelectItem value="penalty">Penalty</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="situation" className="text-right">Situation</Label>
            <Select value={situation} onValueChange={setSituation}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select situation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open_play">Open Play</SelectItem>
                <SelectItem value="fast_break">Fast Break</SelectItem>
                <SelectItem value="corner_related">Corner Related</SelectItem>
                <SelectItem value="direct_free_kick">Direct Free Kick</SelectItem>
                <SelectItem value="penalty">Penalty</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="assistType" className="text-right">Assist Type</Label>
            <Select value={assistType} onValueChange={setAssistType}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select assist type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="pass">Pass</SelectItem>
                <SelectItem value="cross">Cross</SelectItem>
                <SelectItem value="through_ball">Through Ball</SelectItem>
                <SelectItem value="set_piece_assist">Set Piece Assist</SelectItem>
                <SelectItem value="rebound">Rebound</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          </DialogClose>
          <Button type="button" onClick={handleSubmit}>Record Shot</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShotDetailModal;
