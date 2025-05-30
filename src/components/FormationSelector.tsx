
import React from 'react';
import { Formation } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface FormationSelectorProps {
  value: Formation;
  onChange: (value: Formation) => void;
  label?: string;
}

const FormationSelector: React.FC<FormationSelectorProps> = ({ value, onChange, label }) => {
  const formations: Formation[] = ['4-4-2', '4-3-3', '3-5-2', '5-3-2', '4-2-3-1', '3-4-3'];
  
  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select formation" />
        </SelectTrigger>
        <SelectContent>
          {formations.map((formation) => (
            <SelectItem key={formation} value={formation}>
              {formation}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default FormationSelector;
