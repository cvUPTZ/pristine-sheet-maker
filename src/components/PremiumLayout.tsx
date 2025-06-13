
import React from 'react';
import { cn } from '@/lib/utils';

interface PremiumLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function PremiumLayout({ children, className }: PremiumLayoutProps) {
  return (
    <div className={cn(
      "min-h-screen bg-gradient-to-br from-background via-background to-muted/10",
      "relative overflow-hidden",
      className
    )}>
      {/* Modern Background Pattern */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Primary gradient orb */}
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-30 blur-3xl animate-pulse"
             style={{
               background: 'radial-gradient(circle, rgb(79 70 229 / 0.3) 0%, rgb(99 102 241 / 0.1) 50%, transparent 100%)'
             }} />
        
        {/* Secondary gradient orb */}
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse"
             style={{
               background: 'radial-gradient(circle, rgb(139 92 246 / 0.2) 0%, rgb(168 85 247 / 0.1) 50%, transparent 100%)',
               animationDelay: '1s'
             }} />
        
        {/* Accent gradient orb */}
        <div className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full opacity-10 blur-3xl animate-pulse"
             style={{
               background: 'radial-gradient(circle, rgb(34 197 94 / 0.2) 0%, rgb(59 130 246 / 0.1) 50%, transparent 100%)',
               animationDelay: '2s'
             }} />
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.02]"
             style={{
               backgroundImage: `
                 linear-gradient(rgb(15 23 42) 1px, transparent 1px),
                 linear-gradient(90deg, rgb(15 23 42) 1px, transparent 1px)
               `,
               backgroundSize: '40px 40px'
             }} />
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

export default PremiumLayout;
