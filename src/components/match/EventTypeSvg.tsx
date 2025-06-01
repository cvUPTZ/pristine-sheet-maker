
import React from 'react';
import { EventType } from '@/types';

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
    const baseClasses = `w-24 h-24 cursor-pointer transition-all duration-300 transform ${
      isRecording ? 'scale-110 animate-pulse' : 'hover:scale-110'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`;

    switch (eventType.toLowerCase()) {
      case 'goal':
        return (
          <svg className={baseClasses} viewBox="0 0 120 120" onClick={onClick}>
            <defs>
              <radialGradient id="goalGradient" cx="50%" cy="30%">
                <stop offset="0%" stopColor="#FFD700" />
                <stop offset="50%" stopColor="#FF8C00" />
                <stop offset="100%" stopColor="#FF6B35" />
              </radialGradient>
              <filter id="goalGlow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <circle cx="60" cy="60" r="50" fill="url(#goalGradient)" stroke="#FF4500" strokeWidth="4" filter="url(#goalGlow)" />
            <path d="M30 45 L60 30 L90 45 L85 65 L60 75 L35 65 Z" fill="#FFF" opacity="0.95" />
            <circle cx="60" cy="52" r="12" fill="#FFD700" />
            <path d="M50 45 L70 45 M50 50 L70 50 M50 55 L70 55" stroke="#FF6B35" strokeWidth="2" strokeLinecap="round" />
            {isRecording && (
              <g>
                <circle cx="60" cy="60" r="55" fill="none" stroke="#FFD700" strokeWidth="3" opacity="0.8">
                  <animate attributeName="r" values="50;60;50" dur="1s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0.3;0.8" dur="1s" repeatCount="indefinite" />
                </circle>
                <circle cx="60" cy="60" r="45" fill="none" stroke="#FF6B35" strokeWidth="2" opacity="0.6">
                  <animate attributeName="r" values="40;50;40" dur="0.8s" repeatCount="indefinite" />
                </circle>
              </g>
            )}
          </svg>
        );

      case 'pass':
        return (
          <svg className={baseClasses} viewBox="0 0 120 120" onClick={onClick}>
            <defs>
              <linearGradient id="passGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4CAF50" />
                <stop offset="50%" stopColor="#66BB6A" />
                <stop offset="100%" stopColor="#2E7D32" />
              </linearGradient>
              <filter id="passGlow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <circle cx="60" cy="60" r="50" fill="url(#passGradient)" stroke="#1B5E20" strokeWidth="4" filter="url(#passGlow)" />
            <path d="M25 60 L50 40 L50 50 L85 50 L85 40 L95 60 L85 80 L85 70 L50 70 L50 80 Z" fill="#FFF" />
            <circle cx="30" cy="60" r="6" fill="#FFF" opacity="0.9" />
            <circle cx="90" cy="60" r="6" fill="#FFF" opacity="0.9" />
            {isRecording && (
              <g>
                <path d="M25 60 L95 60" stroke="#4CAF50" strokeWidth="4" opacity="0.8">
                  <animate attributeName="stroke-dasharray" values="0,70;35,35;70,0;0,70" dur="1.2s" repeatCount="indefinite" />
                </path>
                <circle cx="60" cy="60" r="55" fill="none" stroke="#4CAF50" strokeWidth="2" opacity="0.6">
                  <animate attributeName="r" values="50;58;50" dur="1s" repeatCount="indefinite" />
                </circle>
              </g>
            )}
          </svg>
        );

      case 'shot':
        return (
          <svg className={baseClasses} viewBox="0 0 120 120" onClick={onClick}>
            <defs>
              <radialGradient id="shotGradient" cx="50%" cy="30%">
                <stop offset="0%" stopColor="#E91E63" />
                <stop offset="50%" stopColor="#F06292" />
                <stop offset="100%" stopColor="#AD1457" />
              </radialGradient>
              <filter id="shotGlow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <circle cx="60" cy="60" r="50" fill="url(#shotGradient)" stroke="#880E4F" strokeWidth="4" filter="url(#shotGlow)" />
            <circle cx="60" cy="60" r="30" fill="none" stroke="#FFF" strokeWidth="3" />
            <circle cx="60" cy="60" r="18" fill="none" stroke="#FFF" strokeWidth="2" />
            <circle cx="60" cy="60" r="8" fill="#FFF" />
            <line x1="60" y1="15" x2="60" y2="25" stroke="#FFF" strokeWidth="3" strokeLinecap="round" />
            <line x1="60" y1="95" x2="60" y2="105" stroke="#FFF" strokeWidth="3" strokeLinecap="round" />
            <line x1="15" y1="60" x2="25" y2="60" stroke="#FFF" strokeWidth="3" strokeLinecap="round" />
            <line x1="95" y1="60" x2="105" y2="60" stroke="#FFF" strokeWidth="3" strokeLinecap="round" />
            {isRecording && (
              <g>
                <circle cx="60" cy="60" r="40" fill="none" stroke="#E91E63" strokeWidth="3" opacity="0.7">
                  <animate attributeName="r" values="30;45;30" dur="0.6s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.7;0.2;0.7" dur="0.6s" repeatCount="indefinite" />
                </circle>
                <circle cx="60" cy="60" r="25" fill="none" stroke="#F06292" strokeWidth="2" opacity="0.5">
                  <animate attributeName="r" values="20;30;20" dur="0.8s" repeatCount="indefinite" />
                </circle>
              </g>
            )}
          </svg>
        );

      case 'foul':
        return (
          <svg className={baseClasses} viewBox="0 0 120 120" onClick={onClick}>
            <defs>
              <linearGradient id="foulGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF5722" />
                <stop offset="50%" stopColor="#FF7043" />
                <stop offset="100%" stopColor="#D32F2F" />
              </linearGradient>
              <filter id="foulGlow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <circle cx="60" cy="60" r="50" fill="url(#foulGradient)" stroke="#B71C1C" strokeWidth="4" filter="url(#foulGlow)" />
            <path d="M35 35 L85 85 M85 35 L35 85" stroke="#FFF" strokeWidth="6" strokeLinecap="round" />
            <circle cx="60" cy="60" r="25" fill="none" stroke="#FFF" strokeWidth="2" opacity="0.5" />
            {isRecording && (
              <g>
                <circle cx="60" cy="60" r="55" fill="none" stroke="#FF5722" strokeWidth="3" opacity="0.8">
                  <animate attributeName="stroke-dasharray" values="0,345;172,172;345,0;0,345" dur="1.5s" repeatCount="indefinite" />
                </circle>
                <path d="M35 35 L85 85 M85 35 L35 85" stroke="#FF5722" strokeWidth="4" opacity="0.6">
                  <animate attributeName="opacity" values="0.6;1;0.6" dur="0.5s" repeatCount="indefinite" />
                </path>
              </g>
            )}
          </svg>
        );

      case 'card':
      case 'yellowcard':
        return (
          <svg className={baseClasses} viewBox="0 0 120 120" onClick={onClick}>
            <defs>
              <linearGradient id="yellowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFEB3B" />
                <stop offset="50%" stopColor="#FFF176" />
                <stop offset="100%" stopColor="#F57F17" />
              </linearGradient>
              <filter id="yellowGlow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <circle cx="60" cy="60" r="50" fill="url(#yellowGradient)" stroke="#E65100" strokeWidth="4" filter="url(#yellowGlow)" />
            <rect x="40" y="30" width="40" height="60" rx="5" fill="#FFF" stroke="#F57F17" strokeWidth="3" />
            <rect x="45" y="35" width="30" height="8" fill="#F57F17" />
            <rect x="45" y="48" width="30" height="2" fill="#F57F17" />
            <rect x="45" y="55" width="30" height="2" fill="#F57F17" />
            {isRecording && (
              <g>
                <rect x="40" y="30" width="40" height="60" rx="5" fill="none" stroke="#FFEB3B" strokeWidth="4" opacity="0.8">
                  <animate attributeName="stroke-width" values="3;6;3" dur="0.8s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0.4;0.8" dur="0.8s" repeatCount="indefinite" />
                </rect>
              </g>
            )}
          </svg>
        );

      case 'redcard':
        return (
          <svg className={baseClasses} viewBox="0 0 120 120" onClick={onClick}>
            <defs>
              <linearGradient id="redGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F44336" />
                <stop offset="50%" stopColor="#EF5350" />
                <stop offset="100%" stopColor="#C62828" />
              </linearGradient>
              <filter id="redGlow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <circle cx="60" cy="60" r="50" fill="url(#redGradient)" stroke="#B71C1C" strokeWidth="4" filter="url(#redGlow)" />
            <rect x="40" y="30" width="40" height="60" rx="5" fill="#FFF" stroke="#C62828" strokeWidth="3" />
            <rect x="45" y="35" width="30" height="8" fill="#C62828" />
            <rect x="45" y="48" width="30" height="2" fill="#C62828" />
            <rect x="45" y="55" width="30" height="2" fill="#C62828" />
            {isRecording && (
              <g>
                <rect x="40" y="30" width="40" height="60" rx="5" fill="none" stroke="#F44336" strokeWidth="4" opacity="0.8">
                  <animate attributeName="stroke-width" values="3;6;3" dur="0.8s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0.4;0.8" dur="0.8s" repeatCount="indefinite" />
                </rect>
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
