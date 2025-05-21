
import React from 'react';

interface PianoIconProps {
  className?: string;
}

const PianoIcon: React.FC<PianoIconProps> = ({ className }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={className}
      width="24"
      height="24"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <line x1="6" y1="4" x2="6" y2="14" />
      <line x1="10" y1="4" x2="10" y2="14" />
      <line x1="14" y1="4" x2="14" y2="14" />
      <line x1="18" y1="4" x2="18" y2="14" />
      <line x1="2" y1="14" x2="22" y2="14" />
    </svg>
  );
};

export default PianoIcon;
