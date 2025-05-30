
import React from 'react';
import { 
  ArrowRight, 
  Target, 
  AlertTriangle, 
  Trophy, 
  Shield, 
  Flag, 
  CornerDownRight,
  ArrowUpDown,
  LucideIcon
} from 'lucide-react';

interface IconProps {
  size?: number;
  className?: string;
}

export function getEventTypeIcon(eventKey: string, props: IconProps = {}): JSX.Element {
  const { size = 24, className = '' } = props;
  
  const iconProps = {
    size,
    className,
    strokeWidth: 2
  };

  switch (eventKey) {
    case 'pass':
      return <ArrowRight {...iconProps} />;
    case 'shot':
      return <Target {...iconProps} />;
    case 'foul':
      return <AlertTriangle {...iconProps} />;
    case 'goal':
      return <Trophy {...iconProps} />;
    case 'save':
      return <Shield {...iconProps} />;
    case 'offside':
      return <Flag {...iconProps} />;
    case 'corner':
      return <CornerDownRight {...iconProps} />;
    case 'sub':
    case 'substitution':
      return <ArrowUpDown {...iconProps} />;
    default:
      return <ArrowRight {...iconProps} />;
  }
}
