
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
    const baseClasses = `w-20 h-20 cursor-pointer transition-all duration-200 transform ${
      isRecording ? 'scale-110 animate-pulse' : 'hover:scale-105'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`;

    switch (eventType.toLowerCase()) {
      case 'goal':
        return (
          <svg className={baseClasses} viewBox="0 0 100 100" onClick={onClick}>
            <defs>
              <radialGradient id="goalGrad" cx="50%" cy="30%">
                <stop offset="0%" stopColor="#FFD700" />
                <stop offset="100%" stopColor="#FF6B35" />
              </radialGradient>
            </defs>
            <circle cx="50" cy="50" r="45" fill="url(#goalGrad)" stroke="#FF4500" strokeWidth="3" />
            <path d="M30 35 L50 25 L70 35 L65 50 L50 55 L35 50 Z" fill="#FFF" opacity="0.9" />
            <circle cx="50" cy="42" r="8" fill="#FFD700" />
            {isRecording && (
              <circle cx="50" cy="50" r="48" fill="none" stroke="#FFD700" strokeWidth="2" opacity="0.7">
                <animate attributeName="r" values="45;50;45" dur="1s" repeatCount="indefinite" />
              </circle>
            )}
          </svg>
        );

      case 'pass':
        return (
          <svg className={baseClasses} viewBox="0 0 100 100" onClick={onClick}>
            <defs>
              <linearGradient id="passGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4CAF50" />
                <stop offset="100%" stopColor="#2E7D32" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="45" fill="url(#passGrad)" stroke="#1B5E20" strokeWidth="3" />
            <path d="M25 50 L45 35 L45 42 L65 42 L65 35 L75 50 L65 65 L65 58 L45 58 L45 65 Z" fill="#FFF" />
            {isRecording && (
              <path d="M25 50 L75 50" stroke="#4CAF50" strokeWidth="3" opacity="0.8">
                <animate attributeName="stroke-dasharray" values="0,50;25,25;50,0" dur="0.8s" repeatCount="indefinite" />
              </path>
            )}
          </svg>
        );

      case 'shot':
        return (
          <svg className={baseClasses} viewBox="0 0 100 100" onClick={onClick}>
            <defs>
              <radialGradient id="shotGrad" cx="50%" cy="30%">
                <stop offset="0%" stopColor="#E91E63" />
                <stop offset="100%" stopColor="#AD1457" />
              </radialGradient>
            </defs>
            <circle cx="50" cy="50" r="45" fill="url(#shotGrad)" stroke="#880E4F" strokeWidth="3" />
            <circle cx="50" cy="50" r="25" fill="none" stroke="#FFF" strokeWidth="3" />
            <circle cx="50" cy="50" r="12" fill="none" stroke="#FFF" strokeWidth="2" />
            <circle cx="50" cy="50" r="4" fill="#FFF" />
            {isRecording && (
              <g>
                <circle cx="50" cy="50" r="30" fill="none" stroke="#E91E63" strokeWidth="2" opacity="0.6">
                  <animate attributeName="r" values="25;35;25" dur="0.6s" repeatCount="indefinite" />
                </circle>
              </g>
            )}
          </svg>
        );

      case 'foul':
        return (
          <svg className={baseClasses} viewBox="0 0 100 100" onClick={onClick}>
            <defs>
              <linearGradient id="foulGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF5722" />
                <stop offset="100%" stopColor="#D32F2F" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="45" fill="url(#foulGrad)" stroke="#B71C1C" strokeWidth="3" />
            <path d="M35 35 L65 65 M65 35 L35 65" stroke="#FFF" strokeWidth="4" strokeLinecap="round" />
            {isRecording && (
              <circle cx="50" cy="50" r="48" fill="none" stroke="#FF5722" strokeWidth="2" opacity="0.7">
                <animate attributeName="stroke-dasharray" values="0,301;150,150;301,0" dur="1s" repeatCount="indefinite" />
              </circle>
            )}
          </svg>
        );

      case 'card':
      case 'yellowcard':
        return (
          <svg className={baseClasses} viewBox="0 0 100 100" onClick={onClick}>
            <defs>
              <linearGradient id="yellowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFEB3B" />
                <stop offset="100%" stopColor="#F57F17" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="45" fill="url(#yellowGrad)" stroke="#E65100" strokeWidth="3" />
            <rect x="35" y="30" width="30" height="40" rx="3" fill="#FFF" stroke="#F57F17" strokeWidth="2" />
            {isRecording && (
              <rect x="35" y="30" width="30" height="40" rx="3" fill="none" stroke="#FFEB3B" strokeWidth="2" opacity="0.8">
                <animate attributeName="stroke-width" values="2;4;2" dur="0.8s" repeatCount="indefinite" />
              </rect>
            )}
          </svg>
        );

      case 'redcard':
        return (
          <svg className={baseClasses} viewBox="0 0 100 100" onClick={onClick}>
            <defs>
              <linearGradient id="redGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F44336" />
                <stop offset="100%" stopColor="#C62828" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="45" fill="url(#redGrad)" stroke="#B71C1C" strokeWidth="3" />
            <rect x="35" y="30" width="30" height="40" rx="3" fill="#FFF" stroke="#C62828" strokeWidth="2" />
            {isRecording && (
              <rect x="35" y="30" width="30" height="40" rx="3" fill="none" stroke="#F44336" strokeWidth="2" opacity="0.8">
                <animate attributeName="stroke-width" values="2;4;2" dur="0.8s" repeatCount="indefinite" />
              </rect>
            )}
          </svg>
        );

      case 'corner':
        return (
          <svg className={baseClasses} viewBox="0 0 100 100" onClick={onClick}>
            <defs>
              <linearGradient id="cornerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#9C27B0" />
                <stop offset="100%" stopColor="#6A1B9A" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="45" fill="url(#cornerGrad)" stroke="#4A148C" strokeWidth="3" />
            <path d="M25 25 L25 45 L45 45 Z" fill="#FFF" />
            <path d="M25 25 Q40 25 40 40" fill="none" stroke="#FFF" strokeWidth="3" />
            {isRecording && (
              <path d="M25 25 Q40 25 40 40" fill="none" stroke="#9C27B0" strokeWidth="2" opacity="0.8">
                <animate attributeName="stroke-dasharray" values="0,50;25,25;50,0" dur="1s" repeatCount="indefinite" />
              </path>
            )}
          </svg>
        );

      case 'freekick':
      case 'free-kick':
        return (
          <svg className={baseClasses} viewBox="0 0 100 100" onClick={onClick}>
            <defs>
              <linearGradient id="freeKickGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00BCD4" />
                <stop offset="100%" stopColor="#0097A7" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="45" fill="url(#freeKickGrad)" stroke="#006064" strokeWidth="3" />
            <circle cx="50" cy="50" r="6" fill="#FFF" />
            <path d="M30 30 Q50 20 70 30 Q50 40 30 30" fill="none" stroke="#FFF" strokeWidth="3" />
            {isRecording && (
              <path d="M30 30 Q50 20 70 30" fill="none" stroke="#00BCD4" strokeWidth="2" opacity="0.8">
                <animate attributeName="stroke-dasharray" values="0,60;30,30;60,0" dur="1s" repeatCount="indefinite" />
              </path>
            )}
          </svg>
        );

      default:
        return (
          <svg className={baseClasses} viewBox="0 0 100 100" onClick={onClick}>
            <defs>
              <linearGradient id="defaultGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#607D8B" />
                <stop offset="100%" stopColor="#455A64" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="45" fill="url(#defaultGrad)" stroke="#263238" strokeWidth="3" />
            <circle cx="50" cy="50" r="20" fill="none" stroke="#FFF" strokeWidth="3" />
            <circle cx="50" cy="35" r="3" fill="#FFF" />
            <path d="M50 45 L50 65" stroke="#FFF" strokeWidth="3" strokeLinecap="round" />
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
