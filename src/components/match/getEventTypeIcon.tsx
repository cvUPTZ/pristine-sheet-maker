
import React from 'react';
import {
  Play,
  Target,
  User,
  AlertTriangle,
  Flag,
  CornerDownRight,
  Trophy,
  Shield,
  Square,
  Plus,
  ArrowRight,
  RotateCcw
} from 'lucide-react';

interface IconProps {
  size?: number;
  className?: string;
}

export function getEventTypeIcon(eventType: string, props: IconProps = {}): React.ReactElement {
  const { size = 24, className = '' } = props;
  const iconProps = { size, className };

  switch (eventType.toLowerCase()) {
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
      return <RotateCcw {...iconProps} />;
    case 'tackle':
      return <User {...iconProps} />;
    case 'cross':
      return <Plus {...iconProps} />;
    default:
      return <Play {...iconProps} />;
  }
}
