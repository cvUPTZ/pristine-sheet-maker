
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
import { EventType as GlobalEventType } from 'src/types/index';

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

// Event metadata for additional context
export interface EventMetadata {
  category: EventCategory;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  aliases: string[];
}

// Comprehensive event mapping with metadata. Keys are camelCase.
// This map defines the local EventType for this file.
const EVENT_MAP = {
  // Ball Actions
  pass: {
    icon: ArrowRight,
    metadata: {
      category: EventCategory.BALL_ACTION,
      severity: 'low' as const,
      description: 'Player passes the ball',
      aliases: ['pass', 'passing']
    }
  },
  shot: {
    icon: Target,
    metadata: {
      category: EventCategory.BALL_ACTION,
      severity: 'medium' as const,
      description: 'Player takes a shot',
      aliases: ['shot', 'shooting', 'attempt']
    }
  },
  goal: {
    icon: Trophy,
    metadata: {
      category: EventCategory.BALL_ACTION,
      severity: 'critical' as const,
      description: 'Goal scored',
      aliases: ['goal', 'score']
    }
  },
  assist: {
    icon: TrendingUp,
    metadata: {
      category: EventCategory.BALL_ACTION,
      severity: 'high' as const,
      description: 'Assist for goal',
      aliases: ['assist', 'setup']
    }
  },
  cross: {
    icon: CornerDownRight,
    metadata: {
      category: EventCategory.BALL_ACTION,
      severity: 'medium' as const,
      description: 'Cross into the box',
      aliases: ['cross', 'crossing']
    }
  },
  header: {
    icon: Circle,
    metadata: {
      category: EventCategory.BALL_ACTION,
      severity: 'medium' as const,
      description: 'Header',
      aliases: ['header', 'head']
    }
  },
  volley: {
    icon: Zap,
    metadata: {
      category: EventCategory.BALL_ACTION,
      severity: 'medium' as const,
      description: 'Volley shot',
      aliases: ['volley']
    }
  },
  penalty: {
    icon: MapPin,
    metadata: {
      category: EventCategory.BALL_ACTION,
      severity: 'critical' as const,
      description: 'Penalty kick',
      aliases: ['penalty', 'pk', 'penalty_kick']
    }
  },
  // Mapped from free_kick. GlobalEventType has 'freeKick' and 'free-kick'.
  freeKick: {
    icon: Play,
    metadata: {
      category: EventCategory.BALL_ACTION,
      severity: 'medium' as const,
      description: 'Free kick',
      aliases: ['free_kick', 'freekick', 'fk', 'free-kick']
    }
  },
  corner: {
    icon: CornerDownRight,
    metadata: {
      category: EventCategory.BALL_ACTION,
      severity: 'medium' as const,
      description: 'Corner kick',
      aliases: ['corner', 'corner_kick']
    }
  },
  // Mapped from throw_in. GlobalEventType has 'throwIn' and 'throw-in'.
  throwIn: {
    icon: RotateCcw,
    metadata: {
      category: EventCategory.BALL_ACTION,
      severity: 'low' as const,
      description: 'Throw in',
      aliases: ['throw_in', 'throw', 'throwin', 'throw-in']
    }
  },
  kickOff: { // Restored and camelCased
    icon: Play,
    metadata: {
      category: EventCategory.MATCH_STATE,
      severity: 'medium' as const,
      description: 'Kick off',
      aliases: ['kick_off', 'kickoff', 'start']
    }
  },
  save: {
    icon: Shield,
    metadata: {
      category: EventCategory.BALL_ACTION,
      severity: 'high' as const,
      description: 'Goalkeeper save',
      aliases: ['save', 'stop']
    }
  },
  block: {
    icon: Square,
    metadata: {
      category: EventCategory.BALL_ACTION,
      severity: 'medium' as const,
      description: 'Shot blocked',
      aliases: ['block', 'blocked']
    }
  },
  clearance: {
    icon: TrendingDown,
    metadata: {
      category: EventCategory.BALL_ACTION,
      severity: 'medium' as const,
      description: 'Ball cleared',
      aliases: ['clearance', 'clear']
    }
  },
  interception: {
    icon: CheckCircle,
    metadata: {
      category: EventCategory.BALL_ACTION,
      severity: 'medium' as const,
      description: 'Ball intercepted',
      aliases: ['interception', 'intercept']
    }
  },
  tackle: {
    icon: Activity,
    metadata: {
      category: EventCategory.BALL_ACTION,
      severity: 'medium' as const,
      description: 'Tackle made',
      aliases: ['tackle', 'tackling']
    }
  },

  // Player Actions
  substitution: {
    icon: ArrowUpDown,
    metadata: {
      category: EventCategory.PLAYER_ACTION,
      severity: 'medium' as const,
      description: 'Player substitution',
      aliases: ['substitution', 'change'] // 'sub' key will map to 'sub' GlobalEventType
    }
  },
  sub: { // 'sub' is a GlobalEventType, maps to local 'sub'
    icon: ArrowUpDown,
    metadata: {
      category: EventCategory.PLAYER_ACTION,
      severity: 'medium' as const,
      description: 'Player substitution (short)',
      aliases: ['sub', 'substitution']
    }
  },
  injury: { // Restored
    icon: Heart,
    metadata: {
      category: EventCategory.PLAYER_ACTION,
      severity: 'high' as const,
      description: 'Player injury',
      aliases: ['injury', 'hurt', 'injured']
    }
  },
  treatment: { // Restored
    icon: UserMinus,
    metadata: {
      category: EventCategory.PLAYER_ACTION,
      severity: 'medium' as const,
      description: 'Medical treatment',
      aliases: ['treatment', 'medical']
    }
  },
  returnToField: { // Restored as returnToField (from 'return')
    icon: UserPlus,
    metadata: {
      category: EventCategory.PLAYER_ACTION,
      severity: 'low' as const,
      description: 'Player returns to field',
      aliases: ['return', 'back']
    }
  },

  // Disciplinary
  foul: {
    icon: AlertTriangle,
    metadata: {
      category: EventCategory.DISCIPLINARY,
      severity: 'medium' as const,
      description: 'Foul committed',
      aliases: ['foul', 'violation']
    }
  },
  // Mapped from yellow_card
  yellowCard: {
    icon: Square,
    metadata: {
      category: EventCategory.DISCIPLINARY,
      severity: 'high' as const,
      description: 'Yellow card shown',
      aliases: ['yellow_card', 'yellow', 'booking', 'caution']
    }
  },
  redCard: { // Was red_card
    icon: XCircle,
    metadata: {
      category: EventCategory.DISCIPLINARY,
      severity: 'critical' as const,
      description: 'Red card shown',
      aliases: ['red_card', 'red', 'ejection', 'dismissal']
    }
  },
  card: { // Generic card, maps to GlobalEventType 'card'
    icon: Square,
    metadata: {
      category: EventCategory.DISCIPLINARY,
      severity: 'high' as const,
      description: 'Card shown (generic)',
      aliases: ['card', 'booked'] // 'booking' alias handled by specific 'booking' type if needed
    }
  },
  booking: { // Restored
    icon: Square,
    metadata: {
      category: EventCategory.DISCIPLINARY,
      severity: 'high' as const,
      description: 'Player booked',
      aliases: ['booking'] // Could add 'yellow_card_booking' if specific
    }
  },
  warning: { // Restored
    icon: AlertTriangle,
    metadata: {
      category: EventCategory.DISCIPLINARY,
      severity: 'medium' as const,
      description: 'Warning given',
      aliases: ['warning', 'warn']
    }
  },
  offside: {
    icon: Flag,
    metadata: {
      category: EventCategory.DISCIPLINARY,
      severity: 'medium' as const,
      description: 'Offside violation',
      aliases: ['offside', 'offside_violation']
    }
  },
  handball: { // Restored
    icon: Ban,
    metadata: {
      category: EventCategory.DISCIPLINARY,
      severity: 'medium' as const,
      description: 'Handball violation',
      aliases: ['handball', 'hand_ball']
    }
  },
  unsportingBehavior: { // Restored and camelCased from unsporting_behavior
    icon: XCircle,
    metadata: {
      category: EventCategory.DISCIPLINARY,
      severity: 'high' as const,
      description: 'Unsporting behavior',
      aliases: ['unsporting_behavior', 'unsporting', 'misconduct']
    }
  },

  // Match State (Restored and camelCased where needed)
  halfTime: {
    icon: Pause,
    metadata: {
      category: EventCategory.MATCH_STATE,
      severity: 'medium' as const,
      description: 'Half time break',
      aliases: ['half_time', 'halftime', 'ht']
    }
  },
  fullTime: {
    icon: StopCircle,
    metadata: {
      category: EventCategory.MATCH_STATE,
      severity: 'high' as const,
      description: 'Full time whistle',
      aliases: ['full_time', 'fulltime', 'ft', 'end']
    }
  },
  extraTime: {
    icon: Timer,
    metadata: {
      category: EventCategory.MATCH_STATE,
      severity: 'high' as const,
      description: 'Extra time period',
      aliases: ['extra_time', 'overtime', 'et']
    }
  },
  penaltyShootout: {
    icon: Target,
    metadata: {
      category: EventCategory.MATCH_STATE,
      severity: 'critical' as const,
      description: 'Penalty shootout',
      aliases: ['penalty_shootout', 'penalties', 'pso']
    }
  },
  varCheck: {
    icon: Clock,
    metadata: {
      category: EventCategory.MATCH_STATE,
      severity: 'medium' as const,
      description: 'VAR check in progress',
      aliases: ['var_check', 'var', 'video_review']
    }
  },
  varDecision: {
    icon: CheckCircle,
    metadata: {
      category: EventCategory.MATCH_STATE,
      severity: 'high' as const,
      description: 'VAR decision made',
      aliases: ['var_decision', 'var_result']
    }
  },
  goalCancelled: {
    icon: XCircle,
    metadata: {
      category: EventCategory.MATCH_STATE,
      severity: 'critical' as const,
      description: 'Goal cancelled',
      aliases: ['goal_cancelled', 'goal_disallowed', 'no_goal']
    }
  },
  goalAwarded: {
    icon: Trophy,
    metadata: {
      category: EventCategory.MATCH_STATE,
      severity: 'critical' as const,
      description: 'Goal awarded',
      aliases: ['goal_awarded', 'goal_confirmed']
    }
  },

  // Tactical (Restored and camelCased where needed)
  formationChange: {
    icon: Users,
    metadata: {
      category: EventCategory.TACTICAL,
      severity: 'medium' as const,
      description: 'Formation change',
      aliases: ['formation_change', 'tactical_change']
    }
  },
  timeout: { // Already camelCase
    icon: Pause,
    metadata: {
      category: EventCategory.TACTICAL,
      severity: 'medium' as const,
      description: 'Timeout called',
      aliases: ['timeout', 'break']
    }
  },
  captainChange: {
    icon: ArrowUpDown,
    metadata: {
      category: EventCategory.TACTICAL,
      severity: 'medium' as const,
      description: 'Captain change',
      aliases: ['captain_change', 'new_captain']
    }
  }
};

// This defines the local EventType based on the keys of the extended EVENT_MAP
export type EventType = keyof typeof EVENT_MAP;

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
  let eventConfig = EVENT_MAP[normalizedKey as EventType]; // Direct lookup with local EventType

  if (!eventConfig) {
    // Search in aliases if not found as a primary key
    for (const mapKey in EVENT_MAP) {
      const currentEvent = EVENT_MAP[mapKey as EventType];
      if (currentEvent.metadata.aliases.some(alias => alias.toLowerCase() === normalizedKey)) {
        eventConfig = currentEvent;
        break;
      }
    }
  }
  
  const IconComponent = eventConfig ? eventConfig.icon : ArrowRight; // Default icon
  
  // Build icon props based on variant and customization
  const iconProps = {
    size,
    className: `event-icon event-icon--${variant} ${className}`.trim(),
    strokeWidth,
    ...(color && { color }),
    'data-event-type': normalizedKey, // Keep original key for data attribute if needed
    'data-event-category': eventConfig?.metadata.category || 'unknown',
    'data-event-severity': eventConfig?.metadata.severity || 'low'
  };

  return <IconComponent {...iconProps} />;
}

// Utility functions for working with events
export function getEventMetadata(eventKey: string): EventMetadata | null {
  const normalizedKey = eventKey.toLowerCase().trim();
  let eventConfig = EVENT_MAP[normalizedKey as EventType];

  if (!eventConfig) {
    for (const mapKey in EVENT_MAP) {
      const currentEvent = EVENT_MAP[mapKey as EventType];
      if (currentEvent.metadata.aliases.some(alias => alias.toLowerCase() === normalizedKey)) {
        eventConfig = currentEvent;
        break;
      }
    }
  }
  return eventConfig ? eventConfig.metadata : null;
}

export function getEventsByCategory(category: EventCategory): EventType[] {
  const events: EventType[] = [];
  for (const mapKey in EVENT_MAP) {
    const eventTypeKey = mapKey as EventType;
    const eventConfig = EVENT_MAP[eventTypeKey];
    if (eventConfig && eventConfig.metadata.category === category) {
      events.push(eventTypeKey);
    }
  }
  return events;
}

export function getEventsBySeverity(severity: 'low' | 'medium' | 'high' | 'critical'): EventType[] {
  const events: EventType[] = [];
  for (const mapKey in EVENT_MAP) {
    const eventTypeKey = mapKey as EventType;
    const eventConfig = EVENT_MAP[eventTypeKey];
    if (eventConfig && eventConfig.metadata.severity === severity) {
      events.push(eventTypeKey);
    }
  }
  return events;
}

export function getAllSupportedEvents(): EventType[] {
  return Object.keys(EVENT_MAP) as EventType[];
}

export function isValidEventType(eventKey: string): boolean {
  const normalizedKey = eventKey.toLowerCase().trim();
  if (EVENT_MAP[normalizedKey as EventType]) { // Check primary keys
    return true;
  }
  // Check aliases
  for (const mapKey in EVENT_MAP) {
    const currentEvent = EVENT_MAP[mapKey as EventType];
    if (currentEvent.metadata.aliases.some(alias => alias.toLowerCase() === normalizedKey)) {
      return true;
    }
  }
  return false;
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
