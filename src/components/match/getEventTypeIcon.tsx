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
  Clock,
  Square,
  Circle,
  Zap,
  Users,
  UserMinus,
  UserPlus,
  Heart,
  Ban,
  MapPin,
  Timer,
  Activity,
  XCircle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  Play,
  Pause,
  StopCircle,
  type LucideIcon
} from 'lucide-react';

// Enhanced interface with more customization options
export interface IconProps {
  size?: number;
  className?: string;
  color?: string;
  strokeWidth?: number;
  variant?: 'default' | 'filled' | 'outline';
}

// Event categories for better organization
export enum EventCategory {
  BALL_ACTION = 'ball_action',
  PLAYER_ACTION = 'player_action',
  DISCIPLINARY = 'disciplinary',
  MATCH_STATE = 'match_state',
  TACTICAL = 'tactical'
}

// Comprehensive event type definitions
export type EventType = 
  // Ball Actions
  | 'pass' | 'shot' | 'goal' | 'assist' | 'cross' | 'header' | 'volley'
  | 'penalty' | 'free_kick' | 'corner' | 'throw_in' | 'kick_off'
  | 'save' | 'block' | 'clearance' | 'interception' | 'tackle'
  
  // Player Actions
  | 'substitution' | 'sub' | 'injury' | 'treatment' | 'return'
  
  // Disciplinary
  | 'foul' | 'yellow_card' | 'red_card' | 'booking' | 'warning'
  | 'offside' | 'handball' | 'unsporting_behavior'
  
  // Match State
  | 'kick_off' | 'half_time' | 'full_time' | 'extra_time' | 'penalty_shootout'
  | 'var_check' | 'var_decision' | 'goal_cancelled' | 'goal_awarded'
  
  // Tactical
  | 'formation_change' | 'timeout' | 'captain_change';

// Event metadata for additional context
export interface EventMetadata {
  category: EventCategory;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  aliases: string[];
}

// Comprehensive event mapping with metadata
const EVENT_MAP: Record<EventType, { icon: LucideIcon; metadata: EventMetadata }> = {
  // Ball Actions
  pass: {
    icon: ArrowRight,
    metadata: {
      category: EventCategory.BALL_ACTION,
      severity: 'low',
      description: 'Player passes the ball',
      aliases: ['pass', 'passing']
    }
  },
  shot: {
    icon: Target,
    metadata: {
      category: EventCategory.BALL_ACTION,
      severity: 'medium',
      description: 'Player takes a shot',
      aliases: ['shot', 'shooting', 'attempt']
    }
  },
  goal: {
    icon: Trophy,
    metadata: {
      category: EventCategory.BALL_ACTION,
      severity: 'critical',
      description: 'Goal scored',
      aliases: ['goal', 'score']
    }
  },
  assist: {
    icon: TrendingUp,
    metadata: {
      category: EventCategory.BALL_ACTION,
      severity: 'high',
      description: 'Assist for goal',
      aliases: ['assist', 'setup']
    }
  },
  cross: {
    icon: CornerDownRight,
    metadata: {
      category: EventCategory.BALL_ACTION,
      severity: 'medium',
      description: 'Cross into the box',
      aliases: ['cross', 'crossing']
    }
  },
  header: {
    icon: Circle,
    metadata: {
      category: EventCategory.BALL_ACTION,
      severity: 'medium',
      description: 'Header',
      aliases: ['header', 'head']
    }
  },
  volley: {
    icon: Zap,
    metadata: {
      category: EventCategory.BALL_ACTION,
      severity: 'medium',
      description: 'Volley shot',
      aliases: ['volley']
    }
  },
  penalty: {
    icon: MapPin,
    metadata: {
      category: EventCategory.BALL_ACTION,
      severity: 'critical',
      description: 'Penalty kick',
      aliases: ['penalty', 'pk', 'penalty_kick']
    }
  },
  free_kick: {
    icon: Play,
    metadata: {
      category: EventCategory.BALL_ACTION,
      severity: 'medium',
      description: 'Free kick',
      aliases: ['free_kick', 'freekick', 'fk']
    }
  },
  corner: {
    icon: CornerDownRight,
    metadata: {
      category: EventCategory.BALL_ACTION,
      severity: 'medium',
      description: 'Corner kick',
      aliases: ['corner', 'corner_kick']
    }
  },
  throw_in: {
    icon: RotateCcw,
    metadata: {
      category: EventCategory.BALL_ACTION,
      severity: 'low',
      description: 'Throw in',
      aliases: ['throw_in', 'throw', 'throwin']
    }
  },
  kick_off: {
    icon: Play,
    metadata: {
      category: EventCategory.MATCH_STATE,
      severity: 'medium',
      description: 'Kick off',
      aliases: ['kick_off', 'kickoff', 'start']
    }
  },
  save: {
    icon: Shield,
    metadata: {
      category: EventCategory.BALL_ACTION,
      severity: 'high',
      description: 'Goalkeeper save',
      aliases: ['save', 'stop']
    }
  },
  block: {
    icon: Square,
    metadata: {
      category: EventCategory.BALL_ACTION,
      severity: 'medium',
      description: 'Shot blocked',
      aliases: ['block', 'blocked']
    }
  },
  clearance: {
    icon: TrendingDown,
    metadata: {
      category: EventCategory.BALL_ACTION,
      severity: 'medium',
      description: 'Ball cleared',
      aliases: ['clearance', 'clear']
    }
  },
  interception: {
    icon: CheckCircle,
    metadata: {
      category: EventCategory.BALL_ACTION,
      severity: 'medium',
      description: 'Ball intercepted',
      aliases: ['interception', 'intercept']
    }
  },
  tackle: {
    icon: Activity,
    metadata: {
      category: EventCategory.BALL_ACTION,
      severity: 'medium',
      description: 'Tackle made',
      aliases: ['tackle', 'tackling']
    }
  },

  // Player Actions
  substitution: {
    icon: ArrowUpDown,
    metadata: {
      category: EventCategory.PLAYER_ACTION,
      severity: 'medium',
      description: 'Player substitution',
      aliases: ['substitution', 'sub', 'change']
    }
  },
  sub: {
    icon: ArrowUpDown,
    metadata: {
      category: EventCategory.PLAYER_ACTION,
      severity: 'medium',
      description: 'Player substitution',
      aliases: ['substitution', 'sub', 'change']
    }
  },
  injury: {
    icon: Heart,
    metadata: {
      category: EventCategory.PLAYER_ACTION,
      severity: 'high',
      description: 'Player injury',
      aliases: ['injury', 'hurt', 'injured']
    }
  },
  treatment: {
    icon: UserMinus,
    metadata: {
      category: EventCategory.PLAYER_ACTION,
      severity: 'medium',
      description: 'Medical treatment',
      aliases: ['treatment', 'medical']
    }
  },
  return: {
    icon: UserPlus,
    metadata: {
      category: EventCategory.PLAYER_ACTION,
      severity: 'low',
      description: 'Player returns to field',
      aliases: ['return', 'back']
    }
  },

  // Disciplinary
  foul: {
    icon: AlertTriangle,
    metadata: {
      category: EventCategory.DISCIPLINARY,
      severity: 'medium',
      description: 'Foul committed',
      aliases: ['foul', 'violation']
    }
  },
  yellow_card: {
    icon: Square,
    metadata: {
      category: EventCategory.DISCIPLINARY,
      severity: 'high',
      description: 'Yellow card shown',
      aliases: ['yellow_card', 'yellow', 'booking', 'caution']
    }
  },
  red_card: {
    icon: XCircle,
    metadata: {
      category: EventCategory.DISCIPLINARY,
      severity: 'critical',
      description: 'Red card shown',
      aliases: ['red_card', 'red', 'ejection', 'dismissal']
    }
  },
  booking: {
    icon: Square,
    metadata: {
      category: EventCategory.DISCIPLINARY,
      severity: 'high',
      description: 'Player booked',
      aliases: ['booking', 'booked', 'card']
    }
  },
  warning: {
    icon: AlertTriangle,
    metadata: {
      category: EventCategory.DISCIPLINARY,
      severity: 'medium',
      description: 'Warning given',
      aliases: ['warning', 'warn']
    }
  },
  offside: {
    icon: Flag,
    metadata: {
      category: EventCategory.DISCIPLINARY,
      severity: 'medium',
      description: 'Offside violation',
      aliases: ['offside', 'offside_violation']
    }
  },
  handball: {
    icon: Ban,
    metadata: {
      category: EventCategory.DISCIPLINARY,
      severity: 'medium',
      description: 'Handball violation',
      aliases: ['handball', 'hand_ball']
    }
  },
  unsporting_behavior: {
    icon: XCircle,
    metadata: {
      category: EventCategory.DISCIPLINARY,
      severity: 'high',
      description: 'Unsporting behavior',
      aliases: ['unsporting_behavior', 'unsporting', 'misconduct']
    }
  },

  // Match State
  half_time: {
    icon: Pause,
    metadata: {
      category: EventCategory.MATCH_STATE,
      severity: 'medium',
      description: 'Half time break',
      aliases: ['half_time', 'halftime', 'ht']
    }
  },
  full_time: {
    icon: StopCircle,
    metadata: {
      category: EventCategory.MATCH_STATE,
      severity: 'high',
      description: 'Full time whistle',
      aliases: ['full_time', 'fulltime', 'ft', 'end']
    }
  },
  extra_time: {
    icon: Timer,
    metadata: {
      category: EventCategory.MATCH_STATE,
      severity: 'high',
      description: 'Extra time period',
      aliases: ['extra_time', 'overtime', 'et']
    }
  },
  penalty_shootout: {
    icon: Target,
    metadata: {
      category: EventCategory.MATCH_STATE,
      severity: 'critical',
      description: 'Penalty shootout',
      aliases: ['penalty_shootout', 'penalties', 'pso']
    }
  },
  var_check: {
    icon: Clock,
    metadata: {
      category: EventCategory.MATCH_STATE,
      severity: 'medium',
      description: 'VAR check in progress',
      aliases: ['var_check', 'var', 'video_review']
    }
  },
  var_decision: {
    icon: CheckCircle,
    metadata: {
      category: EventCategory.MATCH_STATE,
      severity: 'high',
      description: 'VAR decision made',
      aliases: ['var_decision', 'var_result']
    }
  },
  goal_cancelled: {
    icon: XCircle,
    metadata: {
      category: EventCategory.MATCH_STATE,
      severity: 'critical',
      description: 'Goal cancelled',
      aliases: ['goal_cancelled', 'goal_disallowed', 'no_goal']
    }
  },
  goal_awarded: {
    icon: Trophy,
    metadata: {
      category: EventCategory.MATCH_STATE,
      severity: 'critical',
      description: 'Goal awarded',
      aliases: ['goal_awarded', 'goal_confirmed']
    }
  },

  // Tactical
  formation_change: {
    icon: Users,
    metadata: {
      category: EventCategory.TACTICAL,
      severity: 'medium',
      description: 'Formation change',
      aliases: ['formation_change', 'tactical_change']
    }
  },
  timeout: {
    icon: Pause,
    metadata: {
      category: EventCategory.TACTICAL,
      severity: 'medium',
      description: 'Timeout called',
      aliases: ['timeout', 'break']
    }
  },
  captain_change: {
    icon: ArrowUpDown,
    metadata: {
      category: EventCategory.TACTICAL,
      severity: 'medium',
      description: 'Captain change',
      aliases: ['captain_change', 'new_captain']
    }
  }
};

// Enhanced function with better error handling and flexibility
export function getEventTypeIcon(
  eventKey: string, 
  props: IconProps = {}
): JSX.Element {
  const { 
    size = 24, 
    className = '', 
    color,
    strokeWidth = 2,
    variant = 'default'
  } = props;
  
  // Normalize event key (lowercase, handle aliases)
  const normalizedKey = eventKey.toLowerCase().trim();
  
  // Find event by key or alias
  const eventEntry = Object.entries(EVENT_MAP).find(([key, value]) => {
    return key === normalizedKey || 
           value.metadata.aliases.some(alias => 
             alias.toLowerCase() === normalizedKey
           );
  });
  
  const IconComponent = eventEntry ? eventEntry[1].icon : ArrowRight;
  
  // Build icon props based on variant and customization
  const iconProps = {
    size,
    className: `event-icon event-icon--${variant} ${className}`.trim(),
    strokeWidth,
    ...(color && { color }),
    'data-event-type': normalizedKey,
    'data-event-category': eventEntry?.[1].metadata.category || 'unknown',
    'data-event-severity': eventEntry?.[1].metadata.severity || 'low'
  };

  return <IconComponent {...iconProps} />;
}

// Utility functions for working with events
export function getEventMetadata(eventKey: string): EventMetadata | null {
  const normalizedKey = eventKey.toLowerCase().trim();
  const eventEntry = Object.entries(EVENT_MAP).find(([key, value]) => {
    return key === normalizedKey || 
           value.metadata.aliases.some(alias => 
             alias.toLowerCase() === normalizedKey
           );
  });
  
  return eventEntry ? eventEntry[1].metadata : null;
}

export function getEventsByCategory(category: EventCategory): EventType[] {
  return Object.entries(EVENT_MAP)
    .filter(([, value]) => value.metadata.category === category)
    .map(([key]) => key as EventType);
}

export function getEventsBySeverity(severity: 'low' | 'medium' | 'high' | 'critical'): EventType[] {
  return Object.entries(EVENT_MAP)
    .filter(([, value]) => value.metadata.severity === severity)
    .map(([key]) => key as EventType);
}

export function getAllSupportedEvents(): EventType[] {
  return Object.keys(EVENT_MAP) as EventType[];
}

export function isValidEventType(eventKey: string): boolean {
  const normalizedKey = eventKey.toLowerCase().trim();
  return Object.entries(EVENT_MAP).some(([key, value]) => {
    return key === normalizedKey || 
           value.metadata.aliases.some(alias => 
             alias.toLowerCase() === normalizedKey
           );
  });
}

// React component for displaying event info
export interface EventIconWithInfoProps extends IconProps {
  eventType: string;
  showTooltip?: boolean;
  showLabel?: boolean;
}

export function EventIconWithInfo({ 
  eventType, 
  showTooltip = false, 
  showLabel = false,
  ...iconProps 
}: EventIconWithInfoProps): JSX.Element {
  const metadata = getEventMetadata(eventType);
  const icon = getEventTypeIcon(eventType, iconProps);
  
  if (!showTooltip && !showLabel) {
    return icon;
  }
  
  return (
    <div className="event-icon-with-info">
      {icon}
      {showLabel && metadata && (
        <span className="event-label">{metadata.description}</span>
      )}
      {showTooltip && metadata && (
        <div className="event-tooltip" title={metadata.description}>
          {metadata.description}
        </div>
      )}
    </div>
  );
}

// CSS classes for styling (can be imported separately)
export const eventIconStyles = `
.event-icon {
  transition: all 0.2s ease;
}

.event-icon--filled {
  fill: currentColor;
}

.event-icon--outline {
  fill: none;
  stroke: currentColor;
}

.event-icon-with-info {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.event-label {
  font-size: 0.875rem;
  font-weight: 500;
}

.event-tooltip {
  position: relative;
}

/* Severity-based styling */
.event-icon[data-event-severity="critical"] {
  color: #dc2626;
}

.event-icon[data-event-severity="high"] {
  color: #ea580c;
}

.event-icon[data-event-severity="medium"] {
  color: #ca8a04;
}

.event-icon[data-event-severity="low"] {
  color: #16a34a;
}

/* Category-based styling */
.event-icon[data-event-category="disciplinary"] {
  color: #dc2626;
}

.event-icon[data-event-category="ball_action"] {
  color: #2563eb;
}

.event-icon[data-event-category="match_state"] {
  color: #7c3aed;
}

.event-icon[data-event-category="tactical"] {
  color: #059669;
}

.event-icon[data-event-category="player_action"] {
  color: #dc2626;
}
`;

export default getEventTypeIcon;
