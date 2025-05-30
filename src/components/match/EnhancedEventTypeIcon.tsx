
import React from 'react';
import { motion } from 'framer-motion';

interface EnhancedEventTypeIconProps {
  eventKey: string;
  size?: number;
  className?: string;
  isSelected?: boolean;
}

export function EnhancedEventTypeIcon({ 
  eventKey, 
  size = 24, 
  className = '', 
  isSelected = false 
}: EnhancedEventTypeIconProps) {
  const iconProps = {
    width: size,
    height: size,
    className: `transition-all duration-300 ${className}`,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const
  };

  const getAnimation = () => {
    switch (eventKey) {
      case 'pass':
        return {
          rotate: isSelected ? [0, 360] : 0,
          transition: { duration: 0.6, ease: "easeInOut" }
        };
      case 'shot':
        return {
          scale: isSelected ? [1, 1.2, 1] : 1,
          transition: { duration: 0.4, ease: "easeInOut" }
        };
      case 'goal':
        return {
          scale: isSelected ? [1, 1.3, 1] : 1,
          rotate: isSelected ? [0, 15, -15, 0] : 0,
          transition: { duration: 0.8, ease: "easeInOut" }
        };
      case 'foul':
        return {
          x: isSelected ? [0, -2, 2, -2, 2, 0] : 0,
          transition: { duration: 0.5, ease: "easeInOut" }
        };
      case 'save':
        return {
          y: isSelected ? [0, -3, 0] : 0,
          transition: { duration: 0.4, ease: "easeInOut" }
        };
      case 'corner':
        return {
          rotate: isSelected ? [0, 90, 180, 270, 360] : 0,
          transition: { duration: 0.8, ease: "easeInOut" }
        };
      case 'offside':
        return {
          x: isSelected ? [0, 10, 0] : 0,
          transition: { duration: 0.6, ease: "easeInOut" }
        };
      case 'sub':
        return {
          rotateY: isSelected ? [0, 180] : 0,
          transition: { duration: 0.6, ease: "easeInOut" }
        };
      default:
        return {
          scale: isSelected ? [1, 1.1, 1] : 1,
          transition: { duration: 0.3, ease: "easeInOut" }
        };
    }
  };

  const renderIcon = () => {
    switch (eventKey) {
      case 'pass':
        return (
          <svg {...iconProps}>
            <path d="M12 2L22 12L12 22L2 12Z" fill="currentColor" fillOpacity="0.1"/>
            <path d="M8 12L16 12"/>
            <path d="M13 8L16 12L13 16"/>
            <circle cx="7" cy="12" r="2" fill="currentColor"/>
          </svg>
        );
      
      case 'shot':
        return (
          <svg {...iconProps}>
            <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.1"/>
            <circle cx="12" cy="12" r="6"/>
            <circle cx="12" cy="12" r="2" fill="currentColor"/>
            <path d="M12 2V6"/>
            <path d="M12 18V22"/>
            <path d="M22 12H18"/>
            <path d="M6 12H2"/>
          </svg>
        );
      
      case 'goal':
        return (
          <svg {...iconProps}>
            <path d="M6 3H18L21 8V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V8L6 3Z" fill="currentColor" fillOpacity="0.2"/>
            <path d="M6 3H18L21 8V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V8L6 3Z"/>
            <circle cx="12" cy="13" r="3" fill="currentColor"/>
            <path d="M9 10L15 10"/>
            <path d="M9 16L15 16"/>
          </svg>
        );
      
      case 'foul':
        return (
          <svg {...iconProps}>
            <path d="M12 9V13"/>
            <circle cx="12" cy="17" r="1" fill="currentColor"/>
            <path d="M10.29 3.86L1.82 18A2 2 0 0 0 3.54 21H20.46A2 2 0 0 0 22.18 18L13.71 3.86A2 2 0 0 0 10.29 3.86Z" fill="currentColor" fillOpacity="0.1"/>
            <path d="M10.29 3.86L1.82 18A2 2 0 0 0 3.54 21H20.46A2 2 0 0 0 22.18 18L13.71 3.86A2 2 0 0 0 10.29 3.86Z"/>
          </svg>
        );
      
      case 'save':
        return (
          <svg {...iconProps}>
            <path d="M12 22C17 17 20 13 20 8.5C20 5.5 17.5 3 14.5 3C13.35 3 12.34 3.5 12 4.16C11.66 3.5 10.65 3 9.5 3C6.5 3 4 5.5 4 8.5C4 13 7 17 12 22Z" fill="currentColor" fillOpacity="0.2"/>
            <path d="M12 22C17 17 20 13 20 8.5C20 5.5 17.5 3 14.5 3C13.35 3 12.34 3.5 12 4.16C11.66 3.5 10.65 3 9.5 3C6.5 3 4 5.5 4 8.5C4 13 7 17 12 22Z"/>
            <path d="M9 11L11 13L15 9"/>
          </svg>
        );
      
      case 'offside':
        return (
          <svg {...iconProps}>
            <path d="M4 15L8 9L16 9L20 15" fill="currentColor" fillOpacity="0.1"/>
            <path d="M4 15L8 9L16 9L20 15"/>
            <path d="M12 9V21"/>
            <circle cx="12" cy="6" r="2" fill="currentColor"/>
            <path d="M8 21L16 21"/>
          </svg>
        );
      
      case 'corner':
        return (
          <svg {...iconProps}>
            <path d="M3 3V8H8" fill="none"/>
            <path d="M3 3L8 8"/>
            <path d="M21 3V8H16" fill="none"/>
            <path d="M21 3L16 8"/>
            <path d="M3 21V16H8" fill="none"/>
            <path d="M3 21L8 16"/>
            <path d="M21 21V16H16" fill="none"/>
            <path d="M21 21L16 16"/>
            <circle cx="12" cy="12" r="2" fill="currentColor"/>
          </svg>
        );
      
      case 'sub':
        return (
          <svg {...iconProps}>
            <circle cx="9" cy="7" r="2" fill="currentColor" fillOpacity="0.3"/>
            <circle cx="15" cy="7" r="2" fill="currentColor" fillOpacity="0.3"/>
            <path d="M9 14V20"/>
            <path d="M15 14V20"/>
            <path d="M9 14C9 11.79 10.79 10 13 10H11C13.21 10 15 11.79 15 14"/>
            <path d="M7 17L11 17"/>
            <path d="M13 17L17 17"/>
            <path d="M10 15L14 19"/>
            <path d="M14 15L10 19"/>
          </svg>
        );
      
      default:
        return (
          <svg {...iconProps}>
            <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.1"/>
            <path d="M12 6V12L16 14"/>
          </svg>
        );
    }
  };

  return (
    <motion.div
      animate={getAnimation()}
      className="flex items-center justify-center"
    >
      {renderIcon()}
    </motion.div>
  );
}
