import React from 'react';

interface EventTypeSvgProps {
  eventType: string;
  isRecording?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  size?: 'xs' | 'sm' | 'md'; // Added size prop
}

const EventTypeSvg: React.FC<EventTypeSvgProps> = ({
  eventType,
  isRecording = false,
  isSelected = false,
  onClick,
  disabled = false,
  size = 'md' // Default to 'md' if no size is provided
}) => {
  const getEventSvg = () => {
    let sizeClasses = '';
    let hoverScale = 'hover:scale-110'; // Default hover scale for smaller sizes
    let shadow = 'drop-shadow-lg hover:drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]'; // Default shadow for smaller sizes

    if (size === 'xs') {
      sizeClasses = 'w-10 h-10'; // 40px
    } else if (size === 'sm') {
      sizeClasses = 'w-12 h-12'; // 64px
    } else { // 'md' or default
      sizeClasses = 'w-20 h-20'; // 96px - making this the new default medium
      hoverScale = 'hover:scale-125'; // Keep larger hover for md
      shadow = 'drop-shadow-xl hover:drop-shadow-[0_0_25px_rgba(255,255,255,0.25)]'; // Slightly stronger shadow for md
    }

    const baseClasses = `${sizeClasses} cursor-pointer transition-all duration-300 transform ${ // duration-500 to duration-300
      isRecording ? 'scale-110 animate-pulse' : hoverScale // isRecording scale-125 to scale-110
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${shadow}`;

    // Normalize eventType to lowercase for case-insensitivity
    const lowerCaseEventType = eventType.toLowerCase();

    // The viewBox is consistently 200x200 for detailed new icons
    const viewBox = "0 0 200 200";

    switch (lowerCaseEventType) {
      // --- EXISTING ---
      case 'goal':
        return (
          <svg className={baseClasses} viewBox={viewBox} onClick={onClick}>
            <defs>
              <radialGradient id="goalGradient" cx="50%" cy="30%">
                <stop offset="0%" stopColor="#FFD700" />
                <stop offset="30%" stopColor="#FFED4E" />
                <stop offset="60%" stopColor="#FF8C00" />
                <stop offset="100%" stopColor="#FF4500" />
              </radialGradient>
              <radialGradient id="goalInner" cx="50%" cy="40%">
                <stop offset="0%" stopColor="#FFF8DC" />
                <stop offset="50%" stopColor="#FFD700" />
                <stop offset="100%" stopColor="#FF8C00" />
              </radialGradient>
              <filter id="goalGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <circle cx="100" cy="100" r="75" fill="url(#goalGradient)" stroke="#FF4500" strokeWidth="6" filter="url(#goalGlow)" />
            <polygon points="50,70 100,50 150,70 140,110 100,125 60,110" fill="url(#goalInner)" stroke="#FF6B35" strokeWidth="3" opacity="0.95" />
            <g stroke="#FF4500" strokeWidth="2" opacity="0.7">
              <line x1="60" y1="75" x2="140" y2="75" /> <line x1="65" y1="85" x2="135" y2="85" /> <line x1="70" y1="95" x2="130" y2="95" /> <line x1="75" y1="105" x2="125" y2="105" /> <line x1="80" y1="75" x2="85" y2="110" /> <line x1="100" y1="75" x2="100" y2="115" /> <line x1="120" y1="75" x2="115" y2="110" />
            </g>
            <circle cx="100" cy="85" r="18" fill="#FFF" stroke="#333" strokeWidth="2" />
            <polygon points="100,70 108,80 104,92 96,92 92,80" fill="#333" /> <polygon points="108,80 116,85 112,95 104,92" fill="#333" /> <polygon points="92,80 84,85 88,95 96,92" fill="#333" />
            <g fill="#FFF" opacity="0.8">
              <polygon points="130,40 135,50 140,40 135,30" /> <polygon points="65,45 70,55 75,45 70,35" /> <circle cx="155" cy="80" r="3" /> <circle cx="45" cy="120" r="2" />
            </g>
            {isRecording && (
              <g>
                <circle cx="100" cy="100" r="90" fill="none" stroke="#FFD700" strokeWidth="4" opacity="0.8">
                  <animate attributeName="r" values="75;95;75" dur="1s" repeatCount="indefinite" /> <animate attributeName="opacity" values="0.8;0.2;0.8" dur="1s" repeatCount="indefinite" />
                </circle>
                <circle cx="100" cy="100" r="80" fill="none" stroke="#FF6B35" strokeWidth="3" opacity="0.6">
                  <animate attributeName="r" values="70;85;70" dur="0.8s" repeatCount="indefinite" />
                </circle>
              </g>
            )}
          </svg>
        );

      case 'pass':
        return (
          <svg className={baseClasses} viewBox={viewBox} onClick={onClick}>
            <defs>
              <linearGradient id="passGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00E676" /> <stop offset="25%" stopColor="#4CAF50" /> <stop offset="75%" stopColor="#2E7D32" /> <stop offset="100%" stopColor="#1B5E20" />
              </linearGradient>
              <linearGradient id="passArrow" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FFF" /> <stop offset="50%" stopColor="#E8F5E8" /> <stop offset="100%" stopColor="#FFF" />
              </linearGradient>
              <filter id="passGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
                <feMerge> <feMergeNode in="coloredBlur"/> <feMergeNode in="SourceGraphic"/> </feMerge>
              </filter>
            </defs>
            <circle cx="100" cy="100" r="75" fill="url(#passGradient)" stroke="#1B5E20" strokeWidth="6" filter="url(#passGlow)" />
            <path d="M30 100 Q100 60 170 100" fill="none" stroke="url(#passArrow)" strokeWidth="8" strokeLinecap="round" />
            <path d="M30 100 Q100 140 170 100" fill="none" stroke="url(#passArrow)" strokeWidth="6" strokeLinecap="round" opacity="0.7" />
            <polygon points="160,90 180,100 160,110 165,100" fill="#FFF" />
            <polygon points="40,90 20,100 40,110 35,100" fill="#FFF" />
            <circle cx="35" cy="100" r="12" fill="#FFF" stroke="#2E7D32" strokeWidth="3" />
            <circle cx="165" cy="100" r="12" fill="#FFF" stroke="#2E7D32" strokeWidth="3" />
            <g fill="#FFF" opacity="0.8">
              <circle cx="60" cy="85" r="3" /> <circle cx="80" cy="75" r="4" /> <circle cx="100" cy="70" r="5" /> <circle cx="120" cy="75" r="4" /> <circle cx="140" cy="85" r="3" />
            </g>
            <g stroke="#FFF" strokeWidth="2" opacity="0.4">
              <line x1="100" y1="30" x2="100" y2="170" strokeDasharray="5,5" /> <circle cx="100" cy="100" r="40" fill="none" />
            </g>
            {isRecording && (
              <g>
                <path d="M30 100 Q100 60 170 100" stroke="#00E676" strokeWidth="6" opacity="0.8">
                  <animate attributeName="stroke-dasharray" values="0,140;70,70;140,0;0,140" dur="1.2s" repeatCount="indefinite" />
                </path>
                <circle cx="100" cy="100" r="85" fill="none" stroke="#4CAF50" strokeWidth="3" opacity="0.6">
                  <animate attributeName="r" values="75;90;75" dur="1s" repeatCount="indefinite" />
                </circle>
              </g>
            )}
          </svg>
        );

      case 'shot':
        return (
          <svg className={baseClasses} viewBox={viewBox} onClick={onClick}>
            <defs>
              <radialGradient id="shotGradient" cx="50%" cy="30%">
                <stop offset="0%" stopColor="#FF1744" /> <stop offset="40%" stopColor="#E91E63" /> <stop offset="80%" stopColor="#C2185B" /> <stop offset="100%" stopColor="#880E4F" />
              </radialGradient>
              <radialGradient id="targetCenter" cx="50%" cy="50%">
                <stop offset="0%" stopColor="#FFF" /> <stop offset="70%" stopColor="#FFE0E6" /> <stop offset="100%" stopColor="#FF1744" />
              </radialGradient>
              <filter id="shotGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
                <feMerge> <feMergeNode in="coloredBlur"/> <feMergeNode in="SourceGraphic"/> </feMerge>
              </filter>
            </defs>
            <circle cx="100" cy="100" r="75" fill="url(#shotGradient)" stroke="#880E4F" strokeWidth="6" filter="url(#shotGlow)" />
            <circle cx="100" cy="100" r="55" fill="none" stroke="#FFF" strokeWidth="4" />
            <circle cx="100" cy="100" r="40" fill="none" stroke="#FFF" strokeWidth="3" />
            <circle cx="100" cy="100" r="25" fill="none" stroke="#FFF" strokeWidth="3" />
            <circle cx="100" cy="100" r="12" fill="url(#targetCenter)" stroke="#FFF" strokeWidth="2" />
            <g stroke="#FFF" strokeWidth="4" strokeLinecap="round">
              <line x1="100" y1="20" x2="100" y2="35" /> <line x1="100" y1="165" x2="100" y2="180" /> <line x1="20" y1="100" x2="35" y2="100" /> <line x1="165" y1="100" x2="180" y2="100" />
            </g>
            <g stroke="#FFF" strokeWidth="3" strokeLinecap="round" opacity="0.7">
              <line x1="35" y1="35" x2="45" y2="45" /> <line x1="165" y1="35" x2="155" y2="45" /> <line x1="35" y1="165" x2="45" y2="155" /> <line x1="165" y1="165" x2="155" y2="155" />
            </g>
            <path d="M30 130 Q70 100 100 100" fill="none" stroke="#FFF" strokeWidth="3" opacity="0.6" strokeDasharray="8,4" />
            {isRecording && (
              <g>
                <circle cx="100" cy="100" r="65" fill="none" stroke="#FF1744" strokeWidth="4" opacity="0.8">
                  <animate attributeName="r" values="55;75;55" dur="0.6s" repeatCount="indefinite" /> <animate attributeName="opacity" values="0.8;0.3;0.8" dur="0.6s" repeatCount="indefinite" />
                </circle>
                <circle cx="100" cy="100" r="45" fill="none" stroke="#E91E63" strokeWidth="3" opacity="0.6">
                  <animate attributeName="r" values="35;50;35" dur="0.8s" repeatCount="indefinite" />
                </circle>
              </g>
            )}
          </svg>
        );

      case 'foul':
        return (
          <svg className={baseClasses} viewBox={viewBox} onClick={onClick}>
            <defs>
              <linearGradient id="foulGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF3D00" /> <stop offset="30%" stopColor="#FF5722" /> <stop offset="70%" stopColor="#E64A19" /> <stop offset="100%" stopColor="#BF360C" />
              </linearGradient>
              <filter id="foulGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
                <feMerge> <feMergeNode in="coloredBlur"/> <feMergeNode in="SourceGraphic"/> </feMerge>
              </filter>
            </defs>
            <circle cx="100" cy="100" r="75" fill="url(#foulGradient)" stroke="#BF360C" strokeWidth="6" filter="url(#foulGlow)" />
            <g stroke="#FFF" strokeWidth="12" strokeLinecap="round">
              <line x1="50" y1="50" x2="150" y2="150" /> <line x1="150" y1="50" x2="50" y2="150" />
            </g>
            <g fill="#FFF" fontSize="20" fontWeight="bold" textAnchor="middle">
              <text x="100" y="35" opacity="0.9">!</text> <text x="165" y="105" opacity="0.9">!</text> <text x="100" y="175" opacity="0.9">!</text> <text x="35" y="105" opacity="0.9">!</text>
            </g>
            {isRecording && (
              <g>
                <circle cx="100" cy="100" r="85" fill="none" stroke="#FF3D00" strokeWidth="4" opacity="0.8">
                  <animate attributeName="stroke-dasharray" values="0,535;267,267;535,0;0,535" dur="1.5s" repeatCount="indefinite" />
                </circle>
                <g stroke="#FF3D00" strokeWidth="8" opacity="0.7">
                  <line x1="50" y1="50" x2="150" y2="150">
                    <animate attributeName="opacity" values="0.7;1;0.7" dur="0.5s" repeatCount="indefinite" />
                  </line>
                  <line x1="150" y1="50" x2="50" y2="150">
                    <animate attributeName="opacity" values="0.7;1;0.7" dur="0.5s" repeatCount="indefinite" />
                  </line>
                </g>
              </g>
            )}
          </svg>
        );

      case 'card':
      case 'yellowcard':
        return (
          <svg className={baseClasses} viewBox={viewBox} onClick={onClick}>
            <defs>
              <linearGradient id="yellowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFEB3B" /> <stop offset="30%" stopColor="#FFF176" /> <stop offset="70%" stopColor="#FFD54F" /> <stop offset="100%" stopColor="#FF8F00" />
              </linearGradient>
              <linearGradient id="cardFace" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFDE7" /> <stop offset="100%" stopColor="#FFF8E1" />
              </linearGradient>
              <filter id="yellowGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
                <feMerge> <feMergeNode in="coloredBlur"/> <feMergeNode in="SourceGraphic"/> </feMerge>
              </filter>
              <filter id="cardShadow">
                <feDropShadow dx="4" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.3"/>
              </filter>
            </defs>
            <circle cx="100" cy="100" r="75" fill="url(#yellowGradient)" stroke="#E65100" strokeWidth="6" filter="url(#yellowGlow)" />
            <rect x="60" y="40" width="80" height="120" rx="8" fill="#FFC107" stroke="#FF8F00" strokeWidth="4" filter="url(#cardShadow)" />
            <rect x="70" y="50" width="60" height="20" fill="#FFD54F" />
            <text x="100" y="65" textAnchor="middle" fill="#BF360C" fontSize="12" fontWeight="bold">CAUTION</text>
            {isRecording && (
              <g>
                <rect x="60" y="40" width="80" height="120" rx="8" fill="none" stroke="#FFEB3B" strokeWidth="6" opacity="0.8">
                  <animate attributeName="stroke-width" values="4;8;4" dur="0.8s" repeatCount="indefinite" /> <animate attributeName="opacity" values="0.8;0.4;0.8" dur="0.8s" repeatCount="indefinite" />
                </rect>
                <circle cx="100" cy="100" r="85" fill="none" stroke="#FFEB3B" strokeWidth="3" opacity="0.6">
                  <animate attributeName="r" values="75;90;75" dur="1s" repeatCount="indefinite" />
                </circle>
              </g>
            )}
          </svg>
        );

      case 'redcard':
        return (
          <svg className={baseClasses} viewBox={viewBox} onClick={onClick}>
            <defs>
              <linearGradient id="redGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F44336" /> <stop offset="30%" stopColor="#E53935" /> <stop offset="70%" stopColor="#D32F2F" /> <stop offset="100%" stopColor="#B71C1C" />
              </linearGradient>
              <filter id="redGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
                <feMerge> <feMergeNode in="coloredBlur"/> <feMergeNode in="SourceGraphic"/> </feMerge>
              </filter>
              <filter id="redCardShadow">
                <feDropShadow dx="4" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.4"/>
              </filter>
            </defs>
            <circle cx="100" cy="100" r="75" fill="url(#redGradient)" stroke="#B71C1C" strokeWidth="6" filter="url(#redGlow)" />
            <rect x="60" y="40" width="80" height="120" rx="8" fill="#D32F2F" stroke="#B71C1C" strokeWidth="4" filter="url(#redCardShadow)" />
            <rect x="70" y="50" width="60" height="20" fill="#E53935" />
            <text x="100" y="65" textAnchor="middle" fill="#FFF" fontSize="12" fontWeight="bold">DISMISSAL</text>
            {isRecording && (
              <g>
                <rect x="60" y="40" width="80" height="120" rx="8" fill="none" stroke="#F44336" strokeWidth="6" opacity="0.8">
                  <animate attributeName="stroke-width" values="4;8;4" dur="0.8s" repeatCount="indefinite" /> <animate attributeName="opacity" values="0.8;0.4;0.8" dur="0.8s" repeatCount="indefinite" />
                </rect>
                <circle cx="100" cy="100" r="85" fill="none" stroke="#F44336" strokeWidth="3" opacity="0.6">
                  <animate attributeName="r" values="75;90;75" dur="1s" repeatCount="indefinite" />
                </circle>
              </g>
            )}
          </svg>
        );

      case 'corner':
        return (
          <svg className={baseClasses} viewBox={viewBox} onClick={onClick}>
            <defs>
              <linearGradient id="cornerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#9C27B0" /> <stop offset="50%" stopColor="#AB47BC" /> <stop offset="100%" stopColor="#6A1B9A" />
              </linearGradient>
              <filter id="cornerGlow">
                <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
                <feMerge> <feMergeNode in="coloredBlur"/> <feMergeNode in="SourceGraphic"/> </feMerge>
              </filter>
            </defs>
            <circle cx="100" cy="100" r="75" fill="url(#cornerGradient)" stroke="#4A148C" strokeWidth="6" filter="url(#cornerGlow)" />
            <path d="M50 50 L50 150 L150 150" fill="none" stroke="#FFF" strokeWidth="6" />
            <path d="M50 50 Q 150 50 150 150" fill="none" stroke="#FFF" strokeWidth="4" opacity="0.7" strokeDasharray="8,6"/>
            <circle cx="50" cy="50" r="10" fill="#FFF" />
            <text x="50" y="55" textAnchor="middle" fill="#6A1B9A" fontSize="12" fontWeight="bold">C</text>
            {isRecording && (
              <g>
                <path d="M50 50 Q 150 50 150 150" fill="none" stroke="#FFF" strokeWidth="4" opacity="0.9">
                    <animate attributeName="stroke-dasharray" values="0, 200; 100, 100; 200, 0" dur="1.5s" repeatCount="indefinite" />
                </path>
              </g>
            )}
          </svg>
        );
      
      case 'freekick':
      case 'free-kick':
      case 'freekick':
        return (
          <svg className={baseClasses} viewBox={viewBox} onClick={onClick}>
            <defs>
              <linearGradient id="freeKickGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00BCD4" /> <stop offset="50%" stopColor="#4DD0E1" /> <stop offset="100%" stopColor="#0097A7" />
              </linearGradient>
              <filter id="freeKickGlow">
                <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
                <feMerge> <feMergeNode in="coloredBlur"/> <feMergeNode in="SourceGraphic"/> </feMerge>
              </filter>
            </defs>
            <circle cx="100" cy="100" r="75" fill="url(#freeKickGradient)" stroke="#006064" strokeWidth="6" filter="url(#freeKickGlow)" />
            <circle cx="100" cy="140" r="12" fill="#FFF" />
            <g fill="#FFF" opacity="0.8">
              <rect x="70" y="60" width="10" height="30" rx="5" transform="rotate(-15 75 75)" />
              <rect x="95" y="60" width="10" height="30" rx="5" />
              <rect x="120" y="60" width="10" height="30" rx="5" transform="rotate(15 125 75)" />
            </g>
            <path d="M100 130 C 80 100, 120 70, 100 40" fill="none" stroke="#FFF" strokeWidth="4" strokeDasharray="6,4" />
            {isRecording && (
              <g>
                <path d="M100 130 C 80 100, 120 70, 100 40" stroke="#FFF" strokeWidth="5" opacity="0.8">
                  <animate attributeName="stroke-dashoffset" values="0;20;0" dur="0.8s" repeatCount="indefinite" />
                </path>
              </g>
            )}
          </svg>
        );
      
      // --- NEWLY IMPLEMENTED ---
      case 'tackle':
        return (
          <svg className={baseClasses} viewBox={viewBox} onClick={onClick}>
            <defs>
              <radialGradient id="tackleGradient" cx="50%" cy="50%">
                <stop offset="0%" stopColor="#2979FF" /> <stop offset="50%" stopColor="#2962FF" /> <stop offset="100%" stopColor="#1C3AA9" />
              </radialGradient>
              <filter id="tackleGlow">
                <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
                <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
            <circle cx="100" cy="100" r="75" fill="url(#tackleGradient)" stroke="#1A237E" strokeWidth="6" filter="url(#tackleGlow)" />
            <path d="M 50 140 L 100 100 L 140 140" fill="none" stroke="#FFF" strokeWidth="10" strokeLinecap="round" />
            <path d="M 60 60 L 100 100 L 150 50" fill="none" stroke="#FFF" strokeWidth="10" strokeLinecap="round" opacity="0.7"/>
            <circle cx="100" cy="100" r="15" fill="#FFF" />
            <g fill="#FFF" opacity="0.8">
              <path d="M105,95 l20,-20 l5,5 l-20,20 z" /> <path d="M95,105 l-20,20 l-5,-5 l20,-20 z" />
            </g>
            {isRecording && (
              <g>
                <circle cx="100" cy="100" r="20" fill="#FFF" opacity="0.8">
                   <animate attributeName="r" values="15;25;15" dur="0.7s" repeatCount="indefinite" />
                   <animate attributeName="opacity" values="0.8;0.3;0.8" dur="0.7s" repeatCount="indefinite" />
                </circle>
              </g>
            )}
          </svg>
        );

      case 'substitution':
      case 'sub':
        return (
          <svg className={baseClasses} viewBox={viewBox} onClick={onClick}>
            <defs>
              <linearGradient id="subGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#757575" /> <stop offset="50%" stopColor="#616161" /> <stop offset="100%" stopColor="#424242" />
              </linearGradient>
              <filter id="subGlow">
                <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
                <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
            <circle cx="100" cy="100" r="75" fill="url(#subGradient)" stroke="#212121" strokeWidth="6" filter="url(#subGlow)"/>
            {/* Arrow Out */}
            <g fill="#F44336">
              <path d="M 80 50 L 120 50 L 120 80 L 140 65 L 120 50" stroke="#FFF" strokeWidth="3" />
              <text x="100" y="75" textAnchor="middle" fontSize="18" fill="#FFF" fontWeight="bold">-</text>
            </g>
            {/* Arrow In */}
            <g fill="#4CAF50">
              <path d="M 120 150 L 80 150 L 80 120 L 60 135 L 80 150" stroke="#FFF" strokeWidth="3" />
              <text x="100" y="130" textAnchor="middle" fontSize="18" fill="#FFF" fontWeight="bold">+</text>
            </g>
            {isRecording && (
              <g>
                <path d="M 80 50 L 120 50 L 120 80 L 140 65 L 120 50">
                   <animateTransform attributeName="transform" type="translate" values="0 0; 5 0; 0 0" dur="1s" repeatCount="indefinite"/>
                </path>
                <path d="M 120 150 L 80 150 L 80 120 L 60 135 L 80 150">
                   <animateTransform attributeName="transform" type="translate" values="0 0; -5 0; 0 0" dur="1s" repeatCount="indefinite"/>
                </path>
              </g>
            )}
          </svg>
        );
      
      case 'offside':
        return (
          <svg className={baseClasses} viewBox={viewBox} onClick={onClick}>
            <defs>
              <linearGradient id="offsideGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#673AB7" /> <stop offset="50%" stopColor="#7E57C2" /> <stop offset="100%" stopColor="#512DA8" />
              </linearGradient>
              <filter id="offsideGlow">
                <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
                <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
            <circle cx="100" cy="100" r="75" fill="url(#offsideGradient)" stroke="#311B92" strokeWidth="6" filter="url(#offsideGlow)" />
            {/* Offside Line */}
            <line x1="40" y1="100" x2="160" y2="100" stroke="#FFF" strokeWidth="4" strokeDasharray="8,4" />
            {/* Offside Player */}
            <circle cx="130" cy="80" r="10" fill="#F44336" stroke="#FFF" strokeWidth="2" />
            {/* Defending Player */}
            <circle cx="90" cy="120" r="10" fill="#2196F3" stroke="#FFF" strokeWidth="2" />
            {/* Flag */}
            <line x1="50" y1="50" x2="50" y2="150" stroke="#FFF" strokeWidth="4" />
            <rect x="50" y="50" width="40" height="25" fill="#FFEB3B" />
            {isRecording && (
              <g>
                 <rect x="50" y="50" width="40" height="25" fill="#FFEB3B">
                    <animate attributeName="height" values="25;35;25" dur="0.8s" repeatCount="indefinite" />
                 </rect>
              </g>
            )}
          </svg>
        );

      case 'assist':
        return (
          <svg className={baseClasses} viewBox={viewBox} onClick={onClick}>
            <defs>
              <linearGradient id="assistGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#03A9F4" /> <stop offset="50%" stopColor="#29B6F6" /> <stop offset="100%" stopColor="#0288D1" />
              </linearGradient>
              <filter id="assistGlow">
                <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
                <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
            <circle cx="100" cy="100" r="75" fill="url(#assistGradient)" stroke="#01579B" strokeWidth="6" filter="url(#assistGlow)"/>
            <path d="M 50 130 C 70 80, 130 120, 150 70" fill="none" stroke="#FFF" strokeWidth="6" strokeDasharray="10,5"/>
            <polygon points="145,55 165,75 140,80" fill="#FFF" />
            <path d="M150,60 L160,50 L170,60 L160,70 Z" fill="#FFD700" />
            {isRecording && (
              <g>
                <path d="M 50 130 C 70 80, 130 120, 150 70" stroke="#FFF" strokeWidth="6">
                  <animate attributeName="stroke-dashoffset" values="0;20;0" dur="1s" repeatCount="indefinite" />
                </path>
              </g>
            )}
          </svg>
        );

      case 'penalty':
        return (
          <svg className={baseClasses} viewBox={viewBox} onClick={onClick}>
            <defs>
              <radialGradient id="penaltyGradient" cx="50%" cy="50%">
                <stop offset="0%" stopColor="#D500F9" /> <stop offset="50%" stopColor="#AA00FF" /> <stop offset="100%" stopColor="#6200EA" />
              </radialGradient>
              <filter id="penaltyGlow">
                <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
                <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
            <circle cx="100" cy="100" r="75" fill="url(#penaltyGradient)" stroke="#311B92" strokeWidth="6" filter="url(#penaltyGlow)"/>
            {/* Goal */}
            <rect x="60" y="40" width="80" height="15" fill="none" stroke="#FFF" strokeWidth="4" />
            <rect x="60" y="40" width="4" height="40" fill="#FFF" />
            <rect x="136" y="40" width="4" height="40" fill="#FFF" />
            {/* Penalty Spot */}
            <circle cx="100" cy="130" r="6" fill="#FFF"/>
            {/* Ball */}
            <circle cx="100" cy="130" r="10" fill="none" stroke="#FFF" strokeWidth="2" strokeDasharray="3,2"/>
            {isRecording && (
                <circle cx="100" cy="130" r="12" fill="none" stroke="#FFF" strokeWidth="3">
                  <animate attributeName="r" values="10;15;10" dur="0.6s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="1;0.2;1" dur="0.6s" repeatCount="indefinite" />
                </circle>
            )}
          </svg>
        );

      case 'save':
        return (
          <svg className={baseClasses} viewBox={viewBox} onClick={onClick}>
            <defs>
              <linearGradient id="saveGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFC107" /> <stop offset="50%" stopColor="#FFB300" /> <stop offset="100%" stopColor="#FFA000" />
              </linearGradient>
              <filter id="saveGlow">
                <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
                <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
            <circle cx="100" cy="100" r="75" fill="url(#saveGradient)" stroke="#FF6F00" strokeWidth="6" filter="url(#saveGlow)" />
            {/* Goalkeeper Glove */}
            <path d="M 80 140 C 40 120, 40 60, 80 60 L 130 60 C 150 60, 150 80, 130 80 L 125 80" fill="#FFF" stroke="#333" strokeWidth="4" />
            <path d="M 80 90 L 130 90" stroke="#333" strokeWidth="3" />
            <path d="M 80 110 L 120 110" stroke="#333" strokeWidth="3" />
            {/* Ball */}
            <circle cx="60" cy="80" r="15" fill="none" stroke="#333" strokeWidth="3" />
            {/* Impact Lines */}
            <g stroke="#333" strokeWidth="2">
              <path d="M 78 70 L 88 60" /> <path d="M 75 85 L 85 85" /> <path d="M 78 100 L 88 110" />
            </g>
            {isRecording && (
                <g>
                  <animateTransform attributeName="transform" type="translate" values="0 0; -5 -5; 0 0" dur="0.5s" repeatCount="indefinite">
                    <path d="M 80 140 C 40 120, 40 60, 80 60 L 130 60 C 150 60, 150 80, 130 80 L 125 80" fill="#FFF" stroke="#333" strokeWidth="4" />
                  </animateTransform>
                </g>
            )}
          </svg>
        );

      case 'block':
      case 'clearance':
        return (
          <svg className={baseClasses} viewBox={viewBox} onClick={onClick}>
            <defs>
              <linearGradient id="blockGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#455A64" /> <stop offset="50%" stopColor="#546E7A" /> <stop offset="100%" stopColor="#37474F" />
              </linearGradient>
              <filter id="blockGlow">
                <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
                <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
            <circle cx="100" cy="100" r="75" fill="url(#blockGradient)" stroke="#263238" strokeWidth="6" filter="url(#blockGlow)" />
            {/* Shield/Wall */}
            <path d="M 50 60 L 100 40 L 150 60 L 150 140 L 100 160 L 50 140 Z" fill="#FFF" stroke="#263238" strokeWidth="4" />
            <line x1="100" y1="40" x2="100" y2="160" stroke="#B0BEC5" strokeWidth="3" />
            <line x1="50" y1="100" x2="150" y2="100" stroke="#B0BEC5" strokeWidth="3" />
            {isRecording && (
              <g>
                <path d="M 50 60 L 100 40 L 150 60 L 150 140 L 100 160 L 50 140 Z" fill="none" stroke="#FFF" strokeWidth="4" >
                   <animate attributeName="stroke-width" values="4;8;4" dur="0.8s" repeatCount="indefinite" />
                </path>
              </g>
            )}
          </svg>
        );
      
      // ... Add other new cases here ...
      // --- Default Case ---
      default:
        return (
          <svg className={baseClasses} viewBox={viewBox} onClick={onClick}>
            <defs>
              <linearGradient id="defaultGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#607D8B" /> <stop offset="50%" stopColor="#78909C" /> <stop offset="100%" stopColor="#455A64" />
              </linearGradient>
              <filter id="defaultGlow">
                <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
                <feMerge> <feMergeNode in="coloredBlur"/> <feMergeNode in="SourceGraphic"/> </feMerge>
              </filter>
            </defs>
            <circle cx="100" cy="100" r="75" fill="url(#defaultGradient)" stroke="#263238" strokeWidth="6" filter="url(#defaultGlow)" />
            <circle cx="100" cy="100" r="30" fill="none" stroke="#FFF" strokeWidth="6" />
            <text x="100" y="112" textAnchor="middle" fill="#FFF" fontSize="40" fontWeight="bold">?</text>
            {isRecording && (
              <circle cx="100" cy="100" r="85" fill="none" stroke="#607D8B" strokeWidth="3" opacity="0.6">
                <animate attributeName="r" values="75;85;75" dur="1s" repeatCount="indefinite" />
              </circle>
            )}
          </svg>
        );
    }
  };

  return (
    <div className="relative">
      {getEventSvg()}
      {isSelected && (
        <div className="absolute inset-0 rounded-full border-4 border-blue-400 animate-pulse" style={{ pointerEvents: 'none' }} />
      )}
    </div>
  );
};

export default EventTypeSvg;