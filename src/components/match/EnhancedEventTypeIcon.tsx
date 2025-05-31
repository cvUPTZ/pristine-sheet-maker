// src/components/match/EnhancedEventTypeIcon.tsx
import React from 'react';

// --- Placeholder SVGs (Replace with your actual SVG components) ---
const SvgPassIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);
const SvgShotIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="12" r="5"></circle><circle cx="12" cy="12" r="9"></circle>
    <line x1="12" y1="2" x2="12" y2="4"></line><line x1="12" y1="20" x2="12" y2="22"></line>
    <line x1="2" y1="12" x2="4" y2="12"></line><line x1="20" y1="12" x2="22" y2="12"></line>
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
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);
const SvgSaveIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
    <polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline>
  </svg>
);
const SvgOffsideIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="3" x2="21" y2="21"></line><path d="M12 19V5"></path><path d="M5 12H19"></path>
  </svg>
);
const SvgCornerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 3L3 10l7.5 2.5L13 21l8-18z"></path>
  </svg>
);
const SvgSubIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0L12 2.69z"></path>
    <line x1="12" y1="8" x2="12" y2="12"></line><line x1="10" y1="10" x2="14" y2="10"></line>
    <line x1="12" y1="16" x2="12" y2="20"></line><line x1="10" y1="18" x2="14" y2="18"></line>
  </svg>
);
const SvgDefaultIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line>
  </svg>
);
// --- End Placeholder SVGs ---

const eventIcons: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
  'pass': SvgPassIcon,
  'shot': SvgShotIcon,
  'goal': SvgGoalIcon,
  'foul': SvgFoulIcon,
  'save': SvgSaveIcon,
  'offside': SvgOffsideIcon,
  'corner': SvgCornerIcon,
  'sub': SvgSubIcon,
  'default': SvgDefaultIcon,
};

interface EnhancedEventTypeIconProps {
  eventKey: string;
  size?: number;
  isSelected?: boolean;
  className?: string; // To pass through Tailwind classes for color, etc.
}

export const EnhancedEventTypeIcon: React.FC<EnhancedEventTypeIconProps> = ({
  eventKey,
  size = 24,
  isSelected = false,
  className = '',
}) => {
  const IconComponent = eventIcons[eventKey] || eventIcons.default;
  
  // If isSelected, text-white is typically applied by the parent button.
  // Otherwise, the color is determined by the button's state (e.g., EVENT_TYPE_COLORS.text)
  // The className prop can be used to pass text color from parent.
  return <IconComponent width={size} height={size} className={`${className} ${isSelected ? 'text-white' : ''}`} />;
};
