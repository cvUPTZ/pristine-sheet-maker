
import React from 'react';
import { cn } from '@/lib/utils';

interface PremiumStatusBadgeProps {
  status: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  children: React.ReactNode;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'solid' | 'soft' | 'outline';
  className?: string;
  pulse?: boolean;
}

export function PremiumStatusBadge({ 
  status, 
  children, 
  size = 'default', 
  variant = 'soft',
  className,
  pulse = false
}: PremiumStatusBadgeProps) {
  const baseStyles = "inline-flex items-center gap-1.5 font-medium rounded-full transition-all duration-200";
  
  const sizes = {
    sm: 'px-2.5 py-1 text-xs',
    default: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-sm'
  };

  const variants = {
    solid: {
      success: 'bg-success-600 text-white',
      warning: 'bg-warning-600 text-white',
      error: 'bg-error-600 text-white',
      info: 'bg-info-600 text-white',
      neutral: 'bg-muted-foreground text-white'
    },
    soft: {
      success: 'bg-success-50 text-success-700 ring-1 ring-success-600/20',
      warning: 'bg-warning-50 text-warning-700 ring-1 ring-warning-600/20',
      error: 'bg-error-50 text-error-700 ring-1 ring-error-600/20',
      info: 'bg-info-50 text-info-700 ring-1 ring-info-600/20',
      neutral: 'bg-muted text-muted-foreground ring-1 ring-border'
    },
    outline: {
      success: 'border border-success-600 text-success-700 bg-transparent',
      warning: 'border border-warning-600 text-warning-700 bg-transparent',
      error: 'border border-error-600 text-error-700 bg-transparent',
      info: 'border border-info-600 text-info-700 bg-transparent',
      neutral: 'border border-muted-foreground text-muted-foreground bg-transparent'
    }
  };

  return (
    <span className={cn(
      baseStyles,
      sizes[size],
      variants[variant][status],
      pulse && 'animate-pulse',
      className
    )}>
      {pulse && (
        <span className={cn(
          "h-2 w-2 rounded-full animate-pulse",
          status === 'success' && 'bg-success-500',
          status === 'warning' && 'bg-warning-500',
          status === 'error' && 'bg-error-500',
          status === 'info' && 'bg-info-500',
          status === 'neutral' && 'bg-muted-foreground'
        )} />
      )}
      {children}
    </span>
  );
}

export default PremiumStatusBadge;
