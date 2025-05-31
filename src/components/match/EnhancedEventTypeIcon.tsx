// src/components/match/EnhancedEventTypeIcon.tsx
import React, { memo, useMemo } from 'react';

// --- Enhanced SVG Icon Components ---
const SvgPassIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const SvgShotIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="1" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="9" />
    <line x1="12" y1="2" x2="12" y2="4" />
    <line x1="12" y1="20" x2="12" y2="22" />
    <line x1="2" y1="12" x2="4" y2="12" />
    <line x1="20" y1="12" x2="22" y2="12" />
  </svg>
);

const SvgGoalIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const SvgFoulIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const SvgSaveIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);

const SvgOffsideIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="3" x2="21" y2="21" />
    <path d="M12 19V5" />
    <path d="M5 12H19" />
  </svg>
);

const SvgCornerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 3L3 10l7.5 2.5L13 21l8-18z" />
  </svg>
);

const SvgSubIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0L12 2.69z" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="10" y1="10" x2="14" y2="10" />
    <line x1="12" y1="16" x2="12" y2="20" />
    <line x1="10" y1="18" x2="14" y2="18" />
  </svg>
);

const SvgDefaultIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

// --- Enhanced Type Definitions ---
export type EventType = 
  | 'pass'
  | 'shot'
  | 'goal'
  | 'foul'
  | 'save'
  | 'offside'
  | 'corner'
  | 'sub'
  | 'default';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;

export type IconVariant = 'default' | 'selected' | 'disabled' | 'highlighted';

// --- Icon Registry ---
const eventIcons: Record<EventType, React.FC<React.SVGProps<SVGSVGElement>>> = {
  pass: SvgPassIcon,
  shot: SvgShotIcon,
  goal: SvgGoalIcon,
  foul: SvgFoulIcon,
  save: SvgSaveIcon,
  offside: SvgOffsideIcon,
  corner: SvgCornerIcon,
  sub: SvgSubIcon,
  default: SvgDefaultIcon,
};

// --- Size Mapping ---
const sizeMap: Record<Exclude<IconSize, number>, number> = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 48,
};

// --- Variant Styles ---
const variantStyles: Record<IconVariant, string> = {
  default: 'text-gray-600 dark:text-gray-400',
  selected: 'text-white',
  disabled: 'text-gray-300 dark:text-gray-600 opacity-50',
  highlighted: 'text-blue-600 dark:text-blue-400',
};

// --- Enhanced Component Interface ---
export interface EnhancedEventTypeIconProps {
  /** The event type key to determine which icon to render */
  eventKey: EventType | string;
  /** Size of the icon - can be a preset string or custom number */
  size?: IconSize;
  /** Visual variant of the icon */
  variant?: IconVariant;
  /** Legacy prop for backward compatibility */
  isSelected?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Accessibility label for screen readers */
  'aria-label'?: string;
  /** Whether the icon should have a title tooltip */
  title?: string;
  /** Custom stroke width for the SVG */
  strokeWidth?: number;
  /** Animation classes for hover/focus states */
  animationClass?: string;
  /** Whether to show a loading state */
  loading?: boolean;
  /** Click handler */
  onClick?: (event: React.MouseEvent<SVGSVGElement>) => void;
  /** Additional SVG props */
  svgProps?: Omit<React.SVGProps<SVGSVGElement>, 'width' | 'height' | 'className' | 'onClick'>;
}

// --- Enhanced Component ---
export const EnhancedEventTypeIcon: React.FC<EnhancedEventTypeIconProps> = memo(({
  eventKey,
  size = 'md',
  variant = 'default',
  isSelected = false,
  className = '',
  'aria-label': ariaLabel,
  title,
  strokeWidth = 2,
  animationClass = '',
  loading = false,
  onClick,
  svgProps = {},
}) => {
  // Compute the actual size value
  const actualSize = useMemo(() => 
    typeof size === 'number' ? size : sizeMap[size],
    [size]
  );

  // Determine the icon component to use
  const IconComponent = useMemo(() => {
    const normalizedKey = eventKey.toLowerCase() as EventType;
    return eventIcons[normalizedKey] || eventIcons.default;
  }, [eventKey]);

  // Compute the final variant (handle legacy isSelected prop)
  const finalVariant = useMemo(() => {
    if (isSelected) return 'selected';
    return variant;
  }, [variant, isSelected]);

  // Build the className string
  const iconClassName = useMemo(() => {
    const baseClasses = [
      'transition-colors duration-200',
      animationClass,
      variantStyles[finalVariant],
      className
    ].filter(Boolean).join(' ');

    return loading ? `${baseClasses} animate-pulse` : baseClasses;
  }, [animationClass, finalVariant, className, loading]);

  // Accessibility props
  const accessibilityProps = useMemo(() => ({
    'aria-label': ariaLabel || `${eventKey} event icon`,
    role: onClick ? 'button' : 'img',
    ...(onClick && { 
      tabIndex: 0,
      'aria-pressed': isSelected,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(e as any);
        }
      }
    })
  }), [ariaLabel, eventKey, onClick, isSelected]);

  // Loading state
  if (loading) {
    return (
      <div 
        className={`${iconClassName} bg-gray-200 dark:bg-gray-700 rounded`}
        style={{ width: actualSize, height: actualSize }}
        {...accessibilityProps}
      />
    );
  }

  return (
    <IconComponent
      width={actualSize}
      height={actualSize}
      className={iconClassName}
      strokeWidth={strokeWidth}
      onClick={onClick}
      {...accessibilityProps}
      {...(title && { title })}
      {...svgProps}
    />
  );
});

EnhancedEventTypeIcon.displayName = 'EnhancedEventTypeIcon';

// --- Utility Functions ---
export const getAvailableEventTypes = (): EventType[] => {
  return Object.keys(eventIcons) as EventType[];
};

export const isValidEventType = (eventKey: string): eventKey is EventType => {
  return eventKey.toLowerCase() in eventIcons;
};

// --- Default Export ---
export default EnhancedEventTypeIcon;
