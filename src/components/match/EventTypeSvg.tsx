import React from 'react';

interface EventTypeSvgProps {
  eventType: string;
  isRecording?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

const EventTypeSvg: React.FC<EventTypeSvgProps> = ({
  eventType,
  isRecording = false,
  isSelected = false,
  onClick,
  disabled = false
}) => {
  const getEventSvg = () => {
    const baseClasses = `w-40 h-40 cursor-pointer transition-all duration-500 transform ${
      isRecording ? 'scale-125 animate-pulse' : 'hover:scale-125 hover:rotate-3'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} drop-shadow-2xl hover:drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]`;

    switch (eventType.toLowerCase()) {
      case 'goal':
        return (
          <svg className={baseClasses} viewBox="0 0 200 200" onClick={onClick}>
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
              <filter id="innerShadow">
                <feOffset dx="2" dy="2"/>
                <feGaussianBlur stdDeviation="3"/>
                <feComposite operator="out" in="SourceGraphic"/>
                <feComposite operator="atop" in="SourceGraphic"/>
              </filter>
            </defs>
            
            {/* Outer glow ring */}
            <circle cx="100" cy="100" r="85" fill="none" stroke="url(#goalGradient)" strokeWidth="6" opacity="0.3" filter="url(#goalGlow)" />
            
            {/* Main circle */}
            <circle cx="100" cy="100" r="75" fill="url(#goalGradient)" stroke="#FF4500" strokeWidth="6" filter="url(#goalGlow)" />
            
            {/* Goal net background */}
            <polygon points="50,70 100,50 150,70 140,110 100,125 60,110" fill="url(#goalInner)" stroke="#FF6B35" strokeWidth="3" opacity="0.95" />
            
            {/* Net pattern */}
            <g stroke="#FF4500" strokeWidth="2" opacity="0.7">
              <line x1="60" y1="75" x2="140" y2="75" />
              <line x1="65" y1="85" x2="135" y2="85" />
              <line x1="70" y1="95" x2="130" y2="95" />
              <line x1="75" y1="105" x2="125" y2="105" />
              <line x1="80" y1="75" x2="85" y2="110" />
              <line x1="100" y1="75" x2="100" y2="115" />
              <line x1="120" y1="75" x2="115" y2="110" />
            </g>
            
            {/* Soccer ball */}
            <circle cx="100" cy="85" r="18" fill="#FFF" stroke="#333" strokeWidth="2" />
            <polygon points="100,70 108,80 104,92 96,92 92,80" fill="#333" />
            <polygon points="108,80 116,85 112,95 104,92" fill="#333" />
            <polygon points="92,80 84,85 88,95 96,92" fill="#333" />
            
            {/* Sparkle effects */}
            <g fill="#FFF" opacity="0.8">
              <polygon points="130,40 135,50 140,40 135,30" />
              <polygon points="65,45 70,55 75,45 70,35" />
              <circle cx="155" cy="80" r="3" />
              <circle cx="45" cy="120" r="2" />
            </g>
            
            {/* Recording animation */}
            {isRecording && (
              <g>
                <circle cx="100" cy="100" r="90" fill="none" stroke="#FFD700" strokeWidth="4" opacity="0.8">
                  <animate attributeName="r" values="75;95;75" dur="1s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0.2;0.8" dur="1s" repeatCount="indefinite" />
                </circle>
                <circle cx="100" cy="100" r="80" fill="none" stroke="#FF6B35" strokeWidth="3" opacity="0.6">
                  <animate attributeName="r" values="70;85;70" dur="0.8s" repeatCount="indefinite" />
                </circle>
                <circle cx="100" cy="85" r="25" fill="none" stroke="#FFD700" strokeWidth="2" opacity="0.9">
                  <animate attributeName="r" values="18;28;18" dur="0.6s" repeatCount="indefinite" />
                </circle>
              </g>
            )}
          </svg>
        );

      case 'pass':
        return (
          <svg className={baseClasses} viewBox="0 0 200 200" onClick={onClick}>
            <defs>
              <linearGradient id="passGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00E676" />
                <stop offset="25%" stopColor="#4CAF50" />
                <stop offset="75%" stopColor="#2E7D32" />
                <stop offset="100%" stopColor="#1B5E20" />
              </linearGradient>
              <linearGradient id="passArrow" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FFF" />
                <stop offset="50%" stopColor="#E8F5E8" />
                <stop offset="100%" stopColor="#FFF" />
              </linearGradient>
              <filter id="passGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            {/* Main circle */}
            <circle cx="100" cy="100" r="75" fill="url(#passGradient)" stroke="#1B5E20" strokeWidth="6" filter="url(#passGlow)" />
            
            {/* Dynamic arrow path */}
            <path d="M30 100 Q100 60 170 100" fill="none" stroke="url(#passArrow)" strokeWidth="8" strokeLinecap="round" />
            <path d="M30 100 Q100 140 170 100" fill="none" stroke="url(#passArrow)" strokeWidth="6" strokeLinecap="round" opacity="0.7" />
            
            {/* Arrow heads */}
            <polygon points="160,90 180,100 160,110 165,100" fill="#FFF" />
            <polygon points="40,90 20,100 40,110 35,100" fill="#FFF" />
            
            {/* Player positions */}
            <circle cx="35" cy="100" r="12" fill="#FFF" stroke="#2E7D32" strokeWidth="3" />
            <circle cx="165" cy="100" r="12" fill="#FFF" stroke="#2E7D32" strokeWidth="3" />
            
            {/* Ball trajectory dots */}
            <g fill="#FFF" opacity="0.8">
              <circle cx="60" cy="85" r="3" />
              <circle cx="80" cy="75" r="4" />
              <circle cx="100" cy="70" r="5" />
              <circle cx="120" cy="75" r="4" />
              <circle cx="140" cy="85" r="3" />
            </g>
            
            {/* Field lines */}
            <g stroke="#FFF" strokeWidth="2" opacity="0.4">
              <line x1="100" y1="30" x2="100" y2="170" strokeDasharray="5,5" />
              <circle cx="100" cy="100" r="40" fill="none" />
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
          <svg className={baseClasses} viewBox="0 0 200 200" onClick={onClick}>
            <defs>
              <radialGradient id="shotGradient" cx="50%" cy="30%">
                <stop offset="0%" stopColor="#FF1744" />
                <stop offset="40%" stopColor="#E91E63" />
                <stop offset="80%" stopColor="#C2185B" />
                <stop offset="100%" stopColor="#880E4F" />
              </radialGradient>
              <radialGradient id="targetCenter" cx="50%" cy="50%">
                <stop offset="0%" stopColor="#FFF" />
                <stop offset="70%" stopColor="#FFE0E6" />
                <stop offset="100%" stopColor="#FF1744" />
              </radialGradient>
              <filter id="shotGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            {/* Main circle */}
            <circle cx="100" cy="100" r="75" fill="url(#shotGradient)" stroke="#880E4F" strokeWidth="6" filter="url(#shotGlow)" />
            
            {/* Target rings */}
            <circle cx="100" cy="100" r="55" fill="none" stroke="#FFF" strokeWidth="4" />
            <circle cx="100" cy="100" r="40" fill="none" stroke="#FFF" strokeWidth="3" />
            <circle cx="100" cy="100" r="25" fill="none" stroke="#FFF" strokeWidth="3" />
            
            {/* Center bullseye */}
            <circle cx="100" cy="100" r="12" fill="url(#targetCenter)" stroke="#FFF" strokeWidth="2" />
            
            {/* Crosshairs */}
            <g stroke="#FFF" strokeWidth="4" strokeLinecap="round">
              <line x1="100" y1="20" x2="100" y2="35" />
              <line x1="100" y1="165" x2="100" y2="180" />
              <line x1="20" y1="100" x2="35" y2="100" />
              <line x1="165" y1="100" x2="180" y2="100" />
            </g>
            
            {/* Diagonal crosshairs */}
            <g stroke="#FFF" strokeWidth="3" strokeLinecap="round" opacity="0.7">
              <line x1="35" y1="35" x2="45" y2="45" />
              <line x1="165" y1="35" x2="155" y2="45" />
              <line x1="35" y1="165" x2="45" y2="155" />
              <line x1="165" y1="165" x2="155" y2="155" />
            </g>
            
            {/* Power indicators */}
            <g fill="#FFF" opacity="0.9">
              <rect x="85" y="15" width="5" height="12" />
              <rect x="95" y="12" width="5" height="15" />
              <rect x="105" y="10" width="5" height="17" />
              <rect x="115" y="12" width="5" height="15" />
            </g>
            
            {/* Shot trail effect */}
            <path d="M30 130 Q70 100 100 100" fill="none" stroke="#FFF" strokeWidth="3" opacity="0.6" strokeDasharray="8,4" />
            
            {isRecording && (
              <g>
                <circle cx="100" cy="100" r="65" fill="none" stroke="#FF1744" strokeWidth="4" opacity="0.8">
                  <animate attributeName="r" values="55;75;55" dur="0.6s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0.3;0.8" dur="0.6s" repeatCount="indefinite" />
                </circle>
                <circle cx="100" cy="100" r="45" fill="none" stroke="#E91E63" strokeWidth="3" opacity="0.6">
                  <animate attributeName="r" values="35;50;35" dur="0.8s" repeatCount="indefinite" />
                </circle>
                <circle cx="100" cy="100" r="20" fill="none" stroke="#FF1744" strokeWidth="2" opacity="0.9">
                  <animate attributeName="r" values="12;25;12" dur="0.4s" repeatCount="indefinite" />
                </circle>
              </g>
            )}
          </svg>
        );

      case 'foul':
        return (
          <svg className={baseClasses} viewBox="0 0 200 200" onClick={onClick}>
            <defs>
              <linearGradient id="foulGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF3D00" />
                <stop offset="30%" stopColor="#FF5722" />
                <stop offset="70%" stopColor="#E64A19" />
                <stop offset="100%" stopColor="#BF360C" />
              </linearGradient>
              <filter id="foulGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            {/* Main circle */}
            <circle cx="100" cy="100" r="75" fill="url(#foulGradient)" stroke="#BF360C" strokeWidth="6" filter="url(#foulGlow)" />
            
            {/* Warning border */}
            <circle cx="100" cy="100" r="65" fill="none" stroke="#FFF" strokeWidth="3" strokeDasharray="10,5" />
            
            {/* Large X mark */}
            <g stroke="#FFF" strokeWidth="12" strokeLinecap="round">
              <line x1="50" y1="50" x2="150" y2="150" />
              <line x1="150" y1="50" x2="50" y2="150" />
            </g>
            
            {/* Inner prohibition circle */}
            <circle cx="100" cy="100" r="35" fill="none" stroke="#FFF" strokeWidth="4" opacity="0.7" />
            
            {/* Exclamation points around border */}
            <g fill="#FFF" fontSize="20" fontWeight="bold" textAnchor="middle">
              <text x="100" y="35" opacity="0.9">!</text>
              <text x="165" y="105" opacity="0.9">!</text>
              <text x="100" y="175" opacity="0.9">!</text>
              <text x="35" y="105" opacity="0.9">!</text>
            </g>
            
            {/* Warning triangles */}
            <g fill="#FFF" opacity="0.6">
              <polygon points="100,25 110,40 90,40" />
              <polygon points="175,100 165,90 165,110" />
              <polygon points="100,175 90,160 110,160" />
              <polygon points="25,100 35,110 35,90" />
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
          <svg className={baseClasses} viewBox="0 0 200 200" onClick={onClick}>
            <defs>
              <linearGradient id="yellowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFEB3B" />
                <stop offset="30%" stopColor="#FFF176" />
                <stop offset="70%" stopColor="#FFD54F" />
                <stop offset="100%" stopColor="#FF8F00" />
              </linearGradient>
              <linearGradient id="cardFace" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFDE7" />
                <stop offset="100%" stopColor="#FFF8E1" />
              </linearGradient>
              <filter id="yellowGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <filter id="cardShadow">
                <feDropShadow dx="4" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.3"/>
              </filter>
            </defs>
            
            {/* Main circle */}
            <circle cx="100" cy="100" r="75" fill="url(#yellowGradient)" stroke="#E65100" strokeWidth="6" filter="url(#yellowGlow)" />
            
            {/* Card background */}
            <rect x="60" y="40" width="80" height="120" rx="8" fill="url(#cardFace)" stroke="#FF8F00" strokeWidth="4" filter="url(#cardShadow)" />
            
            {/* Card header */}
            <rect x="70" y="50" width="60" height="20" fill="#FFD54F" />
            <text x="100" y="65" textAnchor="middle" fill="#E65100" fontSize="12" fontWeight="bold">CAUTION</text>
            
            {/* FIFA/League logo placeholder */}
            <circle cx="100" cy="85" r="8" fill="#FF8F00" />
            <text x="100" y="90" textAnchor="middle" fill="#FFF" fontSize="10" fontWeight="bold">⚽</text>
            
            {/* Card details lines */}
            <g fill="#FFD54F">
              <rect x="70" y="100" width="60" height="3" />
              <rect x="70" y="110" width="45" height="2" />
              <rect x="70" y="120" width="50" height="2" />
              <rect x="70" y="130" width="35" height="2" />
            </g>
            
            {/* Referee whistle icon */}
            <g fill="#FF8F00" opacity="0.8">
              <ellipse cx="100" cy="145" rx="12" ry="6" />
              <rect x="112" y="143" width="8" height="4" rx="2" />
            </g>
            
            {/* Corner decorations */}
            <g fill="#E65100" opacity="0.6">
              <polygon points="65,45 70,45 65,50" />
              <polygon points="135,45 130,45 135,50" />
              <polygon points="65,155 70,155 65,150" />
              <polygon points="135,155 130,155 135,150" />
            </g>
            
            {isRecording && (
              <g>
                <rect x="60" y="40" width="80" height="120" rx="8" fill="none" stroke="#FFEB3B" strokeWidth="6" opacity="0.8">
                  <animate attributeName="stroke-width" values="4;8;4" dur="0.8s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0.4;0.8" dur="0.8s" repeatCount="indefinite" />
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
          <svg className={baseClasses} viewBox="0 0 200 200" onClick={onClick}>
            <defs>
              <linearGradient id="redGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F44336" />
                <stop offset="30%" stopColor="#E53935" />
                <stop offset="70%" stopColor="#D32F2F" />
                <stop offset="100%" stopColor="#B71C1C" />
              </linearGradient>
              <linearGradient id="redCardFace" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFEBEE" />
                <stop offset="100%" stopColor="#FFCDD2" />
              </linearGradient>
              <filter id="redGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <filter id="redCardShadow">
                <feDropShadow dx="4" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.4"/>
              </filter>
            </defs>
            
            {/* Main circle */}
            <circle cx="100" cy="100" r="75" fill="url(#redGradient)" stroke="#B71C1C" strokeWidth="6" filter="url(#redGlow)" />
            
            {/* Card background */}
            <rect x="60" y="40" width="80" height="120" rx="8" fill="url(#redCardFace)" stroke="#D32F2F" strokeWidth="4" filter="url(#redCardShadow)" />
            
            {/* Card header */}
            <rect x="70" y="50" width="60" height="20" fill="#D32F2F" />
            <text x="100" y="65" textAnchor="middle" fill="#FFF" fontSize="12" fontWeight="bold">DISMISSAL</text>
            
            {/* FIFA/League logo placeholder */}
            <circle cx="100" cy="85" r="8" fill="#B71C1C" />
            <text x="100" y="90" textAnchor="middle" fill="#FFF" fontSize="10" fontWeight="bold">⚽</text>
            
            {/* Card details lines */}
            <g fill="#D32F2F">
              <rect x="70" y="100" width="60" height="3" />
              <rect x="70" y="110" width="45" height="2" />
              <rect x="70" y="120" width="50" height="2" />
              <rect x="70" y="130" width="35" height="2" />
            </g>
            
            {/* Severe foul indicator */}
            <g fill="#B71C1C" opacity="0.8">
              <polygon points="100,140 105,150 95,150" />
              <rect x="98" y="152" width="4" height="8" />
            </g>
            
            {/* Corner decorations */}
            <g fill="#B71C1C" opacity="0.6">
              <polygon points="65,45 70,45 65,50" />
              <polygon points="135,45 130,45 135,50" />
              <polygon points="65,155 70,155 65,150" />
              <polygon points="135,155 130,155 135,150" />
            </g>
            
            {/* Warning border effect */}
            <rect x="58" y="38" width="84" height="124" rx="10" fill="none" stroke="#F44336" strokeWidth="2" opacity="0.5" strokeDasharray="5,3" />
            
            {isRecording && (
              <g>
                <rect x="60" y="40" width="80" height="120" rx="8" fill="none" stroke="#F44336" strokeWidth="6" opacity="0.8">
                  <animate attributeName="stroke-width" values="4;8;4" dur="0.8s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0.4;0.8" dur="0.8s" repeatCount="indefinite" />
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
          <svg className={baseClasses} viewBox="0 0 120 120" onClick={onClick}>
            <defs>
              <linearGradient id="cornerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#9C27B0" />
                <stop offset="50%" stopColor="#AB47BC" />
                <stop offset="100%" stopColor="#6A1B9A" />
              </linearGradient>
              <filter id="cornerGlow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <circle cx="60" cy="60" r="50" fill="url(#cornerGradient)" stroke="#4A148C" strokeWidth="4" filter="url(#cornerGlow)" />
            <path d="M25 25 L25 55 L55 55 Z" fill="#FFF" />
            <path d="M25 25 Q45 25 45 45" fill="none" stroke="#FFF" strokeWidth="4" />
            <circle cx="25" cy="25" r="5" fill="#FFF" />
            <path d="M30 30 L50 50" stroke="#FFF" strokeWidth="2" strokeLinecap="round" strokeDasharray="3,2" />
            {isRecording && (
              <g>
                <path d="M25 25 Q45 25 45 45" fill="none" stroke="#9C27B0" strokeWidth="3" opacity="0.8">
                  <animate attributeName="stroke-dasharray" values="0,60;30,30;60,0;0,60" dur="1.2s" repeatCount="indefinite" />
                </path>
                <circle cx="60" cy="60" r="55" fill="none" stroke="#9C27B0" strokeWidth="2" opacity="0.6">
                  <animate attributeName="r" values="50;58;50" dur="1s" repeatCount="indefinite" />
                </circle>
              </g>
            )}
          </svg>
        );

      case 'freekick':
      case 'free-kick':
        return (
          <svg className={baseClasses} viewBox="0 0 120 120" onClick={onClick}>
            <defs>
              <linearGradient id="freeKickGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00BCD4" />
                <stop offset="50%" stopColor="#4DD0E1" />
                <stop offset="100%" stopColor="#0097A7" />
              </linearGradient>
              <filter id="freeKickGlow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <circle cx="60" cy="60" r="50" fill="url(#freeKickGradient)" stroke="#006064" strokeWidth="4" filter="url(#freeKickGlow)" />
            <circle cx="60" cy="60" r="8" fill="#FFF" />
            <path d="M30 35 Q60 20 90 35 Q60 50 30 35" fill="none" stroke="#FFF" strokeWidth="4" />
            <path d="M35 75 Q60 60 85 75" fill="none" stroke="#FFF" strokeWidth="3" opacity="0.7" />
            <circle cx="30" cy="35" r="3" fill="#FFF" />
            <circle cx="90" cy="35" r="3" fill="#FFF" />
            {isRecording && (
              <g>
                <path d="M30 35 Q60 20 90 35" fill="none" stroke="#00BCD4" strokeWidth="3" opacity="0.8">
                  <animate attributeName="stroke-dasharray" values="0,80;40,40;80,0;0,80" dur="1.2s" repeatCount="indefinite" />
                </path>
                <circle cx="60" cy="60" r="55" fill="none" stroke="#00BCD4" strokeWidth="2" opacity="0.6">
                  <animate attributeName="r" values="50;60;50" dur="1s" repeatCount="indefinite" />
                </circle>
              </g>
            )}
          </svg>
        );

      default:
        return (
          <svg className={baseClasses} viewBox="0 0 120 120" onClick={onClick}>
            <defs>
              <linearGradient id="defaultGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#607D8B" />
                <stop offset="50%" stopColor="#78909C" />
                <stop offset="100%" stopColor="#455A64" />
              </linearGradient>
              <filter id="defaultGlow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <circle cx="60" cy="60" r="50" fill="url(#defaultGradient)" stroke="#263238" strokeWidth="4" filter="url(#defaultGlow)" />
            <circle cx="60" cy="60" r="25" fill="none" stroke="#FFF" strokeWidth="4" />
            <circle cx="60" cy="40" r="4" fill="#FFF" />
            <path d="M60 50 L60 80" stroke="#FFF" strokeWidth="4" strokeLinecap="round" />
            {isRecording && (
              <circle cx="60" cy="60" r="55" fill="none" stroke="#607D8B" strokeWidth="2" opacity="0.6">
                <animate attributeName="r" values="50;58;50" dur="1s" repeatCount="indefinite" />
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
        <div className="absolute inset-0 rounded-full border-4 border-blue-400 animate-pulse" />
      )}
    </div>
  );
};

export default EventTypeSvg;
