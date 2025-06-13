
import React from 'react';
import { cn } from '@/lib/utils';

interface PremiumStatusBadgeProps {
  status: 'success' | 'error' | 'info' | 'neutral';
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
      success: 'bg-success text-success-foreground',
      error: 'bg-destructive text-destructive-foreground', 
      info: 'bg-primary text-primary-foreground',
      neutral: 'bg-muted-foreground text-white'
    },
    soft: {
      success: 'status-success',
      error: 'status-error',
      info: 'status-info',
      neutral: 'status-neutral'
    },
    outline: {
      success: 'border border-success text-success bg-transparent',
      error: 'border border-destructive text-destructive bg-transparent',
      info: 'border border-primary text-primary bg-transparent',
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
          "h-2 w-2 rounded-full",
          status === 'success' && 'bg-success animate-pulse',
          status === 'error' && 'bg-destructive animate-pulse',
          status === 'info' && 'bg-primary animate-pulse',
          status === 'neutral' && 'bg-muted-foreground animate-pulse'
        )} />
      )}
      {children}
    </span>
  );
}

export default PremiumStatusBadge;
