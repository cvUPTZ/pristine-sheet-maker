import React from 'react';
import {
  ArrowRightLeft,
  Crosshair,
  ShieldAlert,
  Goal as GoalNetIcon, // Alias to avoid conflict with a potential 'Goal' event type label if used differently
  ShieldCheck,
  Flag,
  CornerRightUp,
  Replace,
  HelpCircle, // Default icon
  Icon as LucideIcon, // Generic Icon type
} from 'lucide-react';
import { EventType } from './types'; // Assuming EventType might be needed, though key is enough

interface IconProps {
  size?: number;
  className?: string;
}

// Default properties for the icons
const defaultIconProps: IconProps = {
  size: 32, // Corresponds to w-8 h-8, as requested
  className: 'inline-block', // Adjust as needed for layout within buttons
};

export function getEventTypeIcon(
  eventKey: string,
  props?: IconProps
): JSX.Element {
  const iconProps = { ...defaultIconProps, ...props };

  switch (eventKey) {
    case 'pass':
      return <ArrowRightLeft {...iconProps} />;
    case 'shot':
      return <Crosshair {...iconProps} />;
    case 'foul':
      return <ShieldAlert {...iconProps} />;
    case 'goal':
      return <GoalNetIcon {...iconProps} />; // Using the aliased GoalNetIcon
    case 'save':
      return <ShieldCheck {...iconProps} />;
    case 'offside':
      return <Flag {...iconProps} />;
    case 'corner':
      return <CornerRightUp {...iconProps} />;
    case 'sub':
      return <Replace {...iconProps} />;
    default:
      return <HelpCircle {...iconProps} />;
  }
}

// Example of how to potentially extend to return the component itself for more flexibility
export function getEventTypeIconComponent(eventKey: string): LucideIcon {
    switch (eventKey) {
        case 'pass': return ArrowRightLeft;
        case 'shot': return Crosshair;
        case 'foul': return ShieldAlert;
        case 'goal': return GoalNetIcon;
        case 'save': return ShieldCheck;
        case 'offside': return Flag;
        case 'corner': return CornerRightUp;
        case 'sub': return Replace;
        default: return HelpCircle;
    }
}
