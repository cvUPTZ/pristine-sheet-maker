
import React from 'react';
import { cn } from '@/lib/utils';

interface PremiumLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function PremiumLayout({ children, className }: PremiumLayoutProps) {
  return (
    <div className={cn(
      "min-h-screen bg-gradient-to-br from-background via-background to-muted/20",
      className
    )}>
      {/* Premium Background Pattern */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gradient-to-br from-primary/10 to-purple-500/10 blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-gradient-to-br from-accent/20 to-primary/10 blur-3xl animate-pulse-slow" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-gradient-to-br from-secondary/5 to-muted/10 blur-3xl" />
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

export default PremiumLayout;
