
import React, { memo, useMemo, useEffect, useRef, useState, CSSProperties } from 'react';
import * as AllTypes from 'src/types/index';
import { getEventTypeIcon } from './getEventTypeIcon';

// --- Helper: Intersection Observer Hook ---
interface IntersectionObserverHookOptions extends IntersectionObserverInit {
  freezeOnceVisible?: boolean;
}

function useIntersectionObserver(
  options?: IntersectionObserverHookOptions
): [React.Dispatch<React.SetStateAction<HTMLElement | null>>, boolean] {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (observerRef.current && element) {
      observerRef.current.unobserve(element);
    }
    if (!element) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting && options?.freezeOnceVisible && observerRef.current) {
          observerRef.current.unobserve(entry.target);
        }
      },
      options
    );

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current && element) {
        observerRef.current.unobserve(element);
      }
    };
  }, [element, options]);

  return [setElement, isIntersecting];
}

// --- Enhanced SVG Icon Components ---
const SvgPassIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} viewBox="0 0 24 24">
    <path d="M12 2L19 9l-7 7-7-7 7-7Z" opacity="0.6"/>
    <path d="M12 5L17 10l-5 5-5-5 5-5Z" />
  </svg>
);

const SvgShotIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} viewBox="0 0 24 24" strokeWidth="1.5" fill="none">
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    <line x1="12" y1="3" x2="12" y2="7" />
    <line x1="12" y1="17" x2="12" y2="21" />
    <line x1="3" y1="12" x2="7" y2="12" />
    <line x1="17" y1="12" x2="21" y2="12" />
  </svg>
);

const SvgGoalIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} viewBox="0 0 24 24">
    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
  </svg>
);

const SvgDefaultIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

// --- Enhanced Type Definitions ---
export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
export type IconVariant = 'default' | 'selected' | 'disabled' | 'highlighted';

// --- Icon Registry - Updated to include all EventType values ---
const eventIcons: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
  pass: SvgPassIcon,
  shot: SvgShotIcon,
  goal: SvgGoalIcon,
  foul: SvgDefaultIcon,
  save: SvgDefaultIcon,
  offside: SvgDefaultIcon,
  corner: SvgDefaultIcon,
  substitution: SvgDefaultIcon,
  card: SvgDefaultIcon,
  tackle: SvgDefaultIcon,
  assist: SvgDefaultIcon,
  yellowCard: SvgDefaultIcon,
  redCard: SvgDefaultIcon,
  penalty: SvgDefaultIcon,
  cross: SvgDefaultIcon,
  clearance: SvgDefaultIcon,
  block: SvgDefaultIcon,
  interception: SvgDefaultIcon,
  freeKick: SvgDefaultIcon,
  throwIn: SvgDefaultIcon,
  dribble: SvgDefaultIcon,
  sub: SvgDefaultIcon,
  'free-kick': SvgDefaultIcon,
  'goal-kick': SvgDefaultIcon,
  'throw-in': SvgDefaultIcon,
  'yellow-card': SvgDefaultIcon,
  'red-card': SvgDefaultIcon,
  default: SvgDefaultIcon,
};

// --- Size Mapping ---
const sizeMap: Record<Exclude<IconSize, number>, number> = {
  xs: 16, sm: 20, md: 24, lg: 32, xl: 48,
};

// --- Component Props ---
export interface EnhancedEventTypeIconProps {
  eventType: AllTypes.EventType;
  size?: IconSize;
  variant?: IconVariant;
  className?: string;
  style?: CSSProperties;
  accessibilityLabel?: string;
  onClick?: () => void;
  disabled?: boolean;
  'data-testid'?: string;
  showTooltip?: boolean;
  tooltipContent?: React.ReactNode;
}

// --- Main Component ---
export const EnhancedEventTypeIcon: React.FC<EnhancedEventTypeIconProps> = memo(({
  eventType,
  size = 'md',
  variant = 'default',
  className = '',
  style = {},
  accessibilityLabel,
  onClick,
  disabled = false,
  'data-testid': testId,
  showTooltip = false,
  tooltipContent,
}) => {
  const [setRef, isVisible] = useIntersectionObserver({ 
    threshold: 0.1, 
    freezeOnceVisible: true 
  });

  const IconComponent = useMemo(() => {
    return eventIcons[eventType] || eventIcons.default;
  }, [eventType]);

  const iconSize = useMemo(() => {
    return typeof size === 'number' ? size : sizeMap[size];
  }, [size]);

  const computedStyle: CSSProperties = useMemo(() => {
    const baseStyle: CSSProperties = {
      width: iconSize,
      height: iconSize,
      display: 'inline-block',
      ...style,
    };

    if (disabled) {
      baseStyle.opacity = 0.5;
      baseStyle.cursor = 'not-allowed';
    } else if (onClick) {
      baseStyle.cursor = 'pointer';
    }

    return baseStyle;
  }, [iconSize, disabled, onClick, style]);

  const computedClassName = useMemo(() => {
    const classes = ['enhanced-event-icon'];
    
    if (variant !== 'default') {
      classes.push(`enhanced-event-icon--${variant}`);
    }
    
    if (className) {
      classes.push(className);
    }
    
    return classes.join(' ');
  }, [variant, className]);

  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  const iconElement = (
    <span
      ref={setRef}
      className={computedClassName}
      style={computedStyle}
      onClick={handleClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick && !disabled ? 0 : undefined}
      aria-label={accessibilityLabel || `${eventType} event`}
      data-testid={testId}
      data-event-type={eventType}
      data-variant={variant}
      title={showTooltip ? (typeof tooltipContent === 'string' ? tooltipContent : eventType) : undefined}
    >
      {isVisible && <IconComponent />}
    </span>
  );

  return iconElement;
});

EnhancedEventTypeIcon.displayName = 'EnhancedEventTypeIcon';

export default EnhancedEventTypeIcon;
