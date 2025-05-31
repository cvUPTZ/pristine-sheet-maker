// src/components/match/EnhancedEventTypeIcon.tsx
import React, { memo, useMemo, useEffect, useRef, useState, CSSProperties } from 'react';
import { EventType as GlobalEventType } from 'src/types/index';
import { getEventTypeIcon } from './getEventTypeIcon'; // Adjusted path

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
        observerRef.current.unobserve(element); // element might be stale in cleanup
      }
    };
  }, [element, options]);

  return [setElement, isIntersecting];
}


// --- Enhanced SVG Icon Components (New designs based on requirements) ---
// Note: These are simplified representations. Production SVGs would be more detailed.

// TODO: Consider moving individual SVG components to their own files or a dedicated directory
// if this file becomes too large or if SVGs are used elsewhere.

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
    {/* Celebration elements - simple lines */}
    {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
      <line 
        key={angle}
        x1="12" y1="12" 
        x2={12 + 2 * Math.cos(angle * Math.PI / 180)} 
        y2={12 + 2 * Math.sin(angle * Math.PI / 180)} 
        strokeWidth="1.5" strokeLinecap="round"
        style={{ transformOrigin: '12px 12px', animation: `goal-burst-${angle} 0.5s ease-out forwards` }}
      />
    ))}
  </svg>
);

const SvgFoulIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} viewBox="0 0 24 24" strokeWidth="2" fill="none">
    <rect x="4" y="3" width="16" height="18" rx="1" stroke="none" fill="currentColor" opacity="0.1"/>
    <line x1="7" y1="5" x2="7" y2="19" />
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="17" y1="5" x2="17" y2="19" />
    <path d="M11.9 13.5 L12.1 13.5 M12 9 L12 12 M12 15.5 A 0.7 0.7 0 1 0 12 16.9 A 0.7 0.7 0 1 0 12 15.5 Z" 
          strokeWidth="2.5" strokeLinecap="round" style={{ stroke: "var(--icon-accent-color, yellow)" }}/>
  </svg>
);

const SvgSaveIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} viewBox="0 0 24 24">
    <path d="M12 2L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-3z"/>
    <polyline points="8 12.5 11 15.5 16 10.5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" 
              fill="none" style={{ stroke: "var(--icon-accent-color, white)" }}/>
  </svg>
);

const SvgOffsideIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} viewBox="0 0 24 24" strokeWidth="1.5" fill="none">
    <circle cx="8.5" cy="12" r="4.5" opacity="0.7"/>
    <circle cx="15.5" cy="12" r="4.5" opacity="0.7"/>
    <line x1="4" y1="20" x2="20" y2="4" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

const SvgCornerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} viewBox="0 0 24 24" strokeWidth="1.5" fill="none">
    <path d="M5 20V5h7l-2 2.5h-3v7z" fill="currentColor"/> {/* Flag */}
    <line x1="5" y1="20" x2="5" y2="3"/> {/* Pole */}
    <path d="M6 6 C10 2, 16 2, 20 10" strokeDasharray="3 2"/> {/* Arc */}
  </svg>
);

const SvgSubstitutionIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} viewBox="0 0 24 24" strokeWidth="1.5" fill="none">
    <path d="M8 3L8 15M5 12l3 3 3-3" />
    <path d="M16 21L16 9M13 12l3-3 3 3" />
    {/* Player indicators - simplified circles */}
    <circle cx="8" cy="18" r="1.5" fill="currentColor" opacity="0.7" />
    <circle cx="16" cy="6" r="1.5" fill="currentColor" opacity="0.7" />
  </svg>
);

const SvgCardIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} viewBox="0 0 24 24">
    {/* The color will be determined by the 'card' event type palette */}
    <rect x="6" y="3" width="12" height="18" rx="2" />
    {/* Optional: Diagonal line, if not conveyed by color/context.
        For now, relying on color from design system.
        <line x1="7" y1="18" x2="17" y2="4" stroke="rgba(0,0,0,0.2)" strokeWidth="1"/>
    */}
  </svg>
);

// --- Newly Added Custom SVG Icons ---

const SvgTackleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12l-4-4l-4 4"/>
    <path d="M18 12v9"/>
    <path d="M4 16l4-4l-4-4"/>
    <path d="M8 12H2"/>
  </svg>
);

const SvgAssistIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M17 10l-5 5-5-5"/>
    <circle cx="12" cy="12" r="3" opacity="0.5"/>
  </svg>
);

const SvgYellowCardIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  // Similar to SvgCardIcon but typically filled with yellow by design system
  <svg {...props} viewBox="0 0 24 24">
    <rect x="6" y="3" width="12" height="18" rx="2" fill="currentColor"/>
  </svg>
);

const SvgRedCardIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  // Similar to SvgCardIcon but typically filled with red by design system
  <svg {...props} viewBox="0 0 24 24">
    <rect x="6" y="3" width="12" height="18" rx="2" fill="currentColor"/>
  </svg>
);

const SvgPenaltyIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="12" r="3" fill="currentColor"/>
    <path d="M12 16.5V22" strokeLinecap="round"/>
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
export type EventType = GlobalEventType; // Standardized to global type

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
export type IconVariant = 'default' | 'selected' | 'disabled' | 'highlighted';

// Design System Interfaces
interface ColorValue {
  base: string;
  accent?: string;
  textOnBase?: string; // For text or elements on top of the base color
}
interface ColorPalette {
  default: ColorValue;
  selected?: ColorValue;
  disabled?: ColorValue;
  highlighted?: ColorValue;
  highContrast: {
    default: ColorValue;
    selected?: ColorValue;
    disabled?: ColorValue;
    highlighted?: ColorValue;
  };
}

interface AnimationStyle {
  className?: string; // For predefined CSS animations
  inline?: CSSProperties; // For dynamic inline styles if needed
}

interface EventTypeVisuals {
  colorPalette: ColorPalette;
  animation?: AnimationStyle; // Event-specific idle/interaction animation
}

export interface DesignSystem {
  colors: Record<Exclude<EventType, 'default'>, EventTypeVisuals['colorPalette']>;
  animations: { // General hover/focus animations
    hover?: AnimationStyle;
    focus?: AnimationStyle;
    // Event-specific animations can also be here or within colors object
    eventSpecific?: Record<Exclude<EventType, 'default'>, AnimationStyle>;
  };
  // spacing: ResponsiveSpacingSystem; // Consumed via size prop
  // typography: SemanticTypography; // Less relevant for pure icons
  defaultIconColor?: string; // For 'default' event type or fallbacks
  disabledOpacity?: number;
}

// --- Icon Registry ---
const eventIcons: Record<GlobalEventType | 'default', React.FC<React.SVGProps<SVGSVGElement>>> = {
  pass: SvgPassIcon,
  shot: SvgShotIcon,
  goal: SvgGoalIcon,
  foul: SvgFoulIcon,
  save: SvgSaveIcon,
  offside: SvgOffsideIcon,
  corner: SvgCornerIcon,
  substitution: SvgSubstitutionIcon,
  card: SvgCardIcon, // Generic card
  // Adding new custom SVGs
  tackle: SvgTackleIcon,
  assist: SvgAssistIcon,
  yellowCard: SvgYellowCardIcon, // Specific yellow card
  redCard: SvgRedCardIcon,     // Specific red card
  penalty: SvgPenaltyIcon,
  default: SvgDefaultIcon,
};

// --- Size Mapping ---
const sizeMap: Record<Exclude<IconSize, number>, number> = {
  xs: 16, sm: 20, md: 24, lg: 32, xl: 48,
};

// --- Mock Default Design System (Illustrative) ---
// In a real app, this would be provided via context or props from a central theme.
export const defaultDesignSystem: DesignSystem = {
  colors: {
    pass: { 
      default: { base: '#007bff', textOnBase: '#FFFFFF' }, 
      highContrast: { default: { base: '#0AF', textOnBase: '#000' } }
    }, // Blue
    shot: { 
      default: { base: '#ffc107', textOnBase: '#000000' }, 
      highContrast: { default: { base: '#FF0', textOnBase: '#000' } }
    }, // Amber
    goal: { 
      default: { base: '#28a745', textOnBase: '#FFFFFF' }, 
      highContrast: { default: { base: '#0F0', textOnBase: '#000' } }
    }, // Emerald
    foul: { 
      default: { base: '#dc3545', textOnBase: '#FFFFFF', accent: '#FFFF00' }, 
      highContrast: { default: { base: '#F00', textOnBase: '#FFF', accent: '#FF0'} }
    }, // Red
    save: { 
      default: { base: '#6f42c1', textOnBase: '#FFFFFF', accent: '#FFFFFF' }, 
      highContrast: { default: { base: '#F0F', textOnBase: '#000', accent: '#000' } }
    }, // Violet
    offside: { 
      default: { base: '#fd7e14', textOnBase: '#FFFFFF' }, 
      highContrast: { default: { base: '#FA0', textOnBase: '#000' } }
    }, // Orange
    corner: { 
      default: { base: '#17a2b8', textOnBase: '#FFFFFF' }, 
      highContrast: { default: { base: '#0FF', textOnBase: '#000' } }
    }, // Cyan
    substitution: { 
      default: { base: '#82c91e', textOnBase: '#000000' }, 
      highContrast: { default: { base: '#AF0', textOnBase: '#000' } }
    }, // Lime
    card: { 
      default: { base: '#e83e8c', textOnBase: '#FFFFFF' }, // Pink (e.g. for generic card icon)
      // Specific card colors (yellow/red) might be handled by passing fill prop or specific event keys like 'card-yellow'
      highContrast: { default: { base: '#F6B', textOnBase: '#000' } }
    },
    // Colors for new icons
    tackle: {
      default: { base: '#795548', textOnBase: '#FFFFFF' }, // Brown
      highContrast: { default: { base: '#8D6E63', textOnBase: '#000' } }
    },
    assist: {
      default: { base: '#4CAF50', textOnBase: '#FFFFFF' }, // Green
      highContrast: { default: { base: '#66BB6A', textOnBase: '#000' } }
    },
    yellowCard: { // Specific color for yellowCard event type
      default: { base: '#FFEB3B', textOnBase: '#000000' }, // Yellow
      highContrast: { default: { base: '#FFF176', textOnBase: '#000' } }
    },
    redCard: { // Specific color for redCard event type
      default: { base: '#F44336', textOnBase: '#FFFFFF' }, // Red
      highContrast: { default: { base: '#E57373', textOnBase: '#000' } }
    },
    penalty: {
      default: { base: '#9C27B0', textOnBase: '#FFFFFF' }, // Purple
      highContrast: { default: { base: '#BA68C8', textOnBase: '#000' } }
    },
  },
  animations: {
    hover: { className: 'transform scale-110 brightness-110' }, // Example, assumes Tailwind/CSS
    focus: { className: 'ring-2 ring-offset-1' }, // Example
    eventSpecific: {
      pass: { className: 'animate-pass-flow' }, // Define these CSS animations elsewhere
      shot: { className: 'animate-shot-pulse' },
      goal: { className: 'animate-goal-celebrate' },
      foul: { className: 'animate-foul-shake' },
      save: { className: 'animate-save-flip' },
      offside: { className: 'animate-offside-slash' },
      corner: { className: 'animate-corner-arc' },
      substitution: { className: 'animate-substitution-swap' },
      card: { className: 'animate-card-flip' },
      // Animations for new icons (can be simple or unique)
      tackle: { className: 'animate-tackle-impact' },
      assist: { className: 'animate-assist-appear' },
      yellowCard: { className: 'animate-card-flip' }, // Can reuse card animation
      redCard: { className: 'animate-card-flip' },   // Can reuse card animation
      penalty: { className: 'animate-penalty-focus' },
    }
  },
  defaultIconColor: '#6c757d', // Grey for default/fallback
  disabledOpacity: 0.5,
};

// --- Enhanced Component Interface ---
export interface EnhancedEventTypeIconProps {
  eventKey: EventType | string;
  size?: IconSize;
  variant?: IconVariant;
  /** @deprecated Use `variant="selected"` instead */
  isSelected?: boolean;
  className?: string;
  'aria-label'?: string;
  title?: string;
  strokeWidth?: number;
  animationEnabled?: boolean;
  loading?: boolean;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void; // Changed to HTMLDivElement for wrapper
  lazyLoad?: boolean;
  lazyLoadOptions?: IntersectionObserverHookOptions;
  highContrast?: boolean;
  /** Provide a custom design system configuration */
  designSystem?: DesignSystem;
  /** For specific card colors (e.g., 'yellow', 'red'), applied as fill or primary color */
  cardColorOverride?: string;
  /** Additional SVG props, applied to the SVG element */
  svgProps?: Omit<React.SVGProps<SVGSVGElement>, 'width' | 'height' | 'className' | 'onClick' | 'style' | 'strokeWidth'>;
}

// --- Enhanced Component ---
export const EnhancedEventTypeIcon: React.FC<EnhancedEventTypeIconProps> = memo(({
  eventKey,
  size = 'md',
  variant = 'default',
  isSelected, // Handle legacy prop
  className = '',
  'aria-label': ariaLabel,
  title,
  strokeWidth = 1.5, // Default adjusted for new icons
  animationEnabled = true,
  loading = false,
  onClick,
  lazyLoad = false,
  lazyLoadOptions = { rootMargin: '200px', freezeOnceVisible: true },
  highContrast = false,
  designSystem = defaultDesignSystem, // Use injected or default
  cardColorOverride,
  svgProps = {},
}) => {
  const [ref, isIntersecting] = useIntersectionObserver(lazyLoadOptions);
  const [hasBeenVisible, setHasBeenVisible] = useState(!lazyLoad);

  useEffect(() => {
    if (isIntersecting && !hasBeenVisible) {
      setHasBeenVisible(true);
    }
  }, [isIntersecting, hasBeenVisible]);

  const actualSize = useMemo(() => 
    typeof size === 'number' ? size : sizeMap[size],
    [size]
  );

  const normalizedEventKey = useMemo(() => {
    const key = eventKey.toLowerCase();
    // Validate if the key is a known GlobalEventType or 'default'
    // isValidEventType checks against eventIcons keys, which are GlobalEventType | 'default'
    if (isValidEventType(key)) {
      return key;
    }
    // If eventKey is a GlobalEventType but not in eventIcons (and not 'default'),
    // it's a candidate for fallback. We still want to treat it as a valid, non-default key.
    const allGlobalEventTypes = Object.values(GlobalEventType) as string[]; // Needs GlobalEventType to be an enum or const object for this
    // For now, assume eventKey is a valid GlobalEventType string if not in eventIcons for fallback.
    // A stricter check might involve comparing key against all defined GlobalEventTypes.
    // For this task, we pass it through if it's not 'default' and not in eventIcons.
    if (allGlobalEventTypes.includes(key) && key !== 'default') {
        return key as GlobalEventType;
    }
    return 'default';
  }, [eventKey]);

  const CustomIconComponent = useMemo(() => {
    if (normalizedEventKey === 'default') {
      return eventIcons.default;
    }
    return eventIcons[normalizedEventKey as GlobalEventType]; // Might be undefined if not in eventIcons
  }, [normalizedEventKey]);

  const finalVariant = useMemo(() => {
    if (isSelected) return 'selected'; // Legacy prop handling
    return variant;
  }, [variant, isSelected]);

  const currentPalette = useMemo(() => {
    // Ensure normalizedEventKey is not 'default' when accessing designSystem.colors
    if (normalizedEventKey === 'default') return null;
    const dsColors = designSystem.colors[normalizedEventKey as Exclude<GlobalEventType, 'default'>];
    if (!dsColors) return null;

    const modePalette = highContrast ? dsColors.highContrast : dsColors;
    return modePalette[finalVariant] || modePalette.default;
  }, [normalizedEventKey, designSystem.colors, highContrast, finalVariant]);

  const iconStyle = useMemo((): CSSProperties => {
    const style: CSSProperties = {
      width: actualSize,
      height: actualSize,
      color: designSystem.defaultIconColor, // Fallback
      // CSS custom properties for advanced styling within SVGs
      ['--icon-base-color' as string]: designSystem.defaultIconColor,
      ['--icon-accent-color' as string]: designSystem.defaultIconColor,
      ['--icon-text-on-base-color' as string]: '#000000',
    };

    if (loading) {
        style.backgroundColor = highContrast ? '#808080' : '#e0e0e0'; // Simple loading bg
        style.borderRadius = '20%'; // Make skeleton look somewhat icon-like
        return style;
    }

    let baseColor = designSystem.defaultIconColor;
    let accentColor: string | undefined;
    let textOnBaseColor: string | undefined;

    if (normalizedEventKey === 'card' && cardColorOverride) {
      baseColor = cardColorOverride;
      textOnBaseColor = getContrastColor(cardColorOverride); // Helper needed
    } else if (currentPalette) {
      baseColor = currentPalette.base;
      accentColor = currentPalette.accent;
      textOnBaseColor = currentPalette.textOnBase;
    }
    
    style.color = baseColor;
    style['--icon-base-color' as string] = baseColor;
    if (accentColor) style['--icon-accent-color' as string] = accentColor;
    if (textOnBaseColor) style['--icon-text-on-base-color' as string] = textOnBaseColor;

    if (finalVariant === 'disabled') {
      style.opacity = designSystem.disabledOpacity ?? 0.5;
      // Optionally, use a specific disabled color if defined in palette
      // style.color = currentPalette?.disabled?.base || desaturate(baseColor);
    }
    
    return style;
  }, [actualSize, loading, highContrast, normalizedEventKey, cardColorOverride, currentPalette, designSystem, finalVariant]);

  const iconClassName = useMemo(() => {
    let classes = ['enhanced-event-type-icon', 'inline-flex items-center justify-center'];
    
    if (className) classes.push(className);
    if (loading) classes.push('animate-pulse');
    
    if (animationEnabled && !loading) {
      classes.push('transition-all duration-200 ease-in-out');
      // Ensure normalizedEventKey is not 'default' when accessing eventSpecific animations
      const eventAnim = normalizedEventKey !== 'default'
        ? designSystem.animations.eventSpecific?.[normalizedEventKey as Exclude<GlobalEventType, 'default'>]
        : undefined;
      if (eventAnim?.className) classes.push(eventAnim.className);
      
      if (onClick) { // Add hover/focus animations only if interactive
        if (designSystem.animations.hover?.className) classes.push(designSystem.animations.hover.className);
        if (designSystem.animations.focus?.className) classes.push(designSystem.animations.focus.className);
      }
    }

    // Example: if variant has specific classes
    // classes.push(`variant-${finalVariant}`);
    // if (highContrast) classes.push('high-contrast');

    return classes.join(' ');
  }, [className, loading, animationEnabled, designSystem.animations, normalizedEventKey, onClick]);

  const accessibilityProps = useMemo(() => ({
    'aria-label': ariaLabel || `${normalizedEventKey} event icon`, // TODO: Consider i18n for eventKey
    role: onClick ? 'button' : 'img',
    tabIndex: onClick ? 0 : undefined,
    'aria-pressed': onClick ? (finalVariant === 'selected') : undefined,
  }), [ariaLabel, normalizedEventKey, onClick, finalVariant]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick(e as any); // Cast needed as event is on div, not button
    }
  };

  // Render placeholder for lazy loading or actual loading state
  if (!hasBeenVisible || loading) {
    return (
      <div
        ref={lazyLoad && !hasBeenVisible ? ref : null}
        className={iconClassName}
        style={iconStyle}
        title={loading ? "Loading icon" : title}
        {...(loading && accessibilityProps)} // Apply accessibility to placeholder if it's a loading state
        aria-busy={loading ? true : undefined}
      />
    );
  }
  
  // Main render logic
  let iconContent: JSX.Element | null = null;

  if (CustomIconComponent) {
    iconContent = (
      <CustomIconComponent
        width={actualSize}
        height={actualSize}
        strokeWidth={strokeWidth}
        fill={ (normalizedEventKey === 'yellowCard' || normalizedEventKey === 'redCard' || (normalizedEventKey === 'card' && cardColorOverride))
               ? (cardColorOverride || iconStyle.color) // Use cardColorOverride or styled color for cards
               : (svgProps.fill && svgProps.fill !== 'none' ? svgProps.fill : "currentColor")
             }
        stroke={ (svgProps.fill && svgProps.fill !== 'none') ? "none" : (svgProps.stroke || "currentColor") }
        {...svgProps}
      />
    );
  } else if (normalizedEventKey !== 'default') {
    // Fallback to getEventTypeIcon
    // Ensure props passed to getEventTypeIcon are suitable.
    // getEventTypeIcon expects IconProps: { size, className, color, strokeWidth, variant }
    // We use actualSize, iconStyle.color, and strokeWidth from EnhancedEventTypeIcon.
    iconContent = getEventTypeIcon(normalizedEventKey, {
      size: actualSize,
      color: iconStyle.color, // Use the color determined by the design system
      strokeWidth: strokeWidth,
      // className: '', // Potentially pass a specific class for fallback icons
      // variant: 'default', // Or map from Enhanced's variant
    });
  } else {
    // This case should ideally be covered by CustomIconComponent if normalizedEventKey is 'default'
    // but as a failsafe:
    const DefaultIcon = eventIcons.default;
    iconContent = (
      <DefaultIcon
        width={actualSize}
        height={actualSize}
        strokeWidth={strokeWidth}
        {...svgProps}
      />
    );
  }

  if (onClick) {
    return (
      <div
        ref={lazyLoad ? ref : null}
        className={iconClassName}
        style={iconStyle}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        title={title}
        {...accessibilityProps}
      >
        {iconContent}
      </div>
    );
  }

  return (
    <div
      ref={lazyLoad ? ref : null}
      className={iconClassName}
      style={iconStyle}
      title={title}
      {...accessibilityProps}
    >
      {iconContent}
    </div>
  );
});

EnhancedEventTypeIcon.displayName = 'EnhancedEventTypeIcon';

// --- Utility Functions ---
// getAvailableEventTypes now returns all GlobalEventTypes that have a custom icon.
export const getAvailableCustomEventTypes = (): GlobalEventType[] => {
  return Object.keys(eventIcons).filter(key => key !== 'default') as GlobalEventType[];
};

// isValidEventType checks if a key is a valid GlobalEventType AND has a custom icon OR is 'default'.
// For fallback mechanism, we might not need this to be so strict,
// as normalizedEventKey will handle falling back to 'default' if the key isn't a GlobalEventType at all.
// The check for `eventIcons[normalizedEventKey as GlobalEventType]` is the main determinant for custom vs fallback.
export const isValidEventType = (eventKey: string): eventKey is (GlobalEventType | 'default') => {
  // This function checks if the eventKey is one of the keys in our eventIcons map (custom SVGs)
  // or if it's the special 'default' key.
  return eventKey in eventIcons;
};

// Helper to get contrasting color (simplified)
function getContrastColor(hexcolor: string): string {
  if (hexcolor.startsWith('#')) {
    hexcolor = hexcolor.slice(1);
  }
  if (hexcolor.length === 3) {
    hexcolor = hexcolor.split('').map(char => char + char).join('');
  }
  const r = parseInt(hexcolor.substring(0, 2), 16);
  const g = parseInt(hexcolor.substring(2, 4), 16);
  const b = parseInt(hexcolor.substring(4, 6), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? '#000000' : '#FFFFFF';
}

/**
 * Example CSS animations (to be defined in a global CSS file or via CSS-in-JS):
 * .animate-pass-flow { animation: pass-flow 2s infinite linear; }
 * @keyframes pass-flow { 0% { transform: translateX(-2px) rotate(-5deg); } 50% { transform: translateX(2px) rotate(5deg); } 100% { transform: translateX(-2px) rotate(-5deg); } }
 * 
 * .animate-shot-pulse { animation: shot-pulse 1.5s infinite ease-in-out; }
 * @keyframes shot-pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.7; } }
 * 
 * ...and so on for other event types.
 * 
 * For 1000+ concurrent icons, consider:
 * 1. SVG Sprites: Reduces DOM nodes if SVGs are complex, use <use xlink:href="..."></use>.
 * 2. Canvas Rendering: For extreme cases, libraries like Konva.js or PixiJS can render many shapes efficiently.
 *    This component could have a `renderAs="canvas"` prop in a more advanced version.
 * 3. Virtualization: If icons are in a list, only render visible ones.
 *
 * Accessibility Note on Colors:
 * The provided `defaultDesignSystem` colors are illustrative. For WCAG 2.1 AAA,
 * color contrasts (e.g., icon color vs. background, parts of icon vs. other parts if conveying info)
 * must meet 7:1 for normal text/visual elements or 4.5:1 for large text/robust visual elements.
 * High contrast mode should aim for these higher ratios. Use tools to verify.
 */

export default EnhancedEventTypeIcon;
