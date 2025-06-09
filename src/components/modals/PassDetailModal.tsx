
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PassEventData } from '@/types/eventData';
import { PlayerForPianoInput } from '../TrackerPianoInput';
import { useToast } from '@/hooks/use-toast';

interface PassDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (details: PassEventData) => void;
  initialDetails: Partial<PassEventData>;
  passer: PlayerForPianoInput | null;
  teamPlayers: PlayerForPianoInput[];
}

const PassDetailModal: React.FC<PassDetailModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialDetails,
  passer,
  teamPlayers,
}) => {
  const { toast } = useToast();
  const [recipientId, setRecipientId] = useState<string | number | undefined>(initialDetails.recipient_player_id);
  const [isSuccess, setIsSuccess] = useState<boolean>(initialDetails.success === undefined ? true : initialDetails.success);
  const [passType, setPassType] = useState<string>(initialDetails.pass_type || 'short');

  useEffect(() => {
    if (isOpen) {
      setRecipientId(initialDetails.recipient_player_id);
      setIsSuccess(initialDetails.success === undefined ? true : initialDetails.success);
      setPassType(initialDetails.pass_type || 'short');
    }
  }, [isOpen, initialDetails]);

  const handleSubmit = () => {
    if (!recipientId) {
      toast({
        title: "Recipient Required",
        description: "Please select the recipient of the pass.",
        variant: "destructive",
      });
      return;
    }
    onSubmit({
      success: isSuccess,
      recipient_player_id: recipientId,
      pass_type: passType,
      // end_coordinates will be undefined as per design for this modal
    });
    onClose();
  };

  const availableRecipients = teamPlayers.filter(p => p.id !== passer?.id);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Pass Details (From: {passer?.name || 'Selected Player'})</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="recipientPlayer" className="text-right">Recipient</Label>
            <Select
              value={recipientId ? String(recipientId) : undefined}
              onValueChange={(value) => setRecipientId(value)}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select recipient player" />
              </SelectTrigger>
              <SelectContent>
                {availableRecipients.map(player => (
                  <SelectItem key={player.id} value={String(player.id)}>
                    {player.name} (#{player.jersey_number || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="isSuccess" checked={isSuccess} onCheckedChange={(checked) => setIsSuccess(Boolean(checked))} />
            <Label htmlFor="isSuccess">Pass Successful?</Label>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="passType" className="text-right">Pass Type</Label>
            <Select value={passType} onValueChange={setPassType}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select pass type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="short">Short</SelectItem>
                <SelectItem value="long">Long</SelectItem>
                <SelectItem value="cross">Cross</SelectItem>
                <SelectItem value="header">Header Pass</SelectItem>
                <SelectItem value="through_ball">Through Ball</SelectItem>
                <SelectItem value="switch">Switch</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          </DialogClose>
          <Button type="button" onClick={handleSubmit}>Record Pass</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PassDetailModal;
