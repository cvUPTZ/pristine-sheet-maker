
import React from 'react';
import { Button } from '@/components/ui/button';
import { Bell, Search, Settings, User } from 'luc ide-react';
import { cn } from '@/lib/utils';

interface PremiumHeaderProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PremiumHeader({ title, subtitle, actions, className }: PremiumHeaderProps) {
  return (
    <header className={cn(
      "sticky top-0 z-40 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      className
    )}>
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left side - Title and subtitle */}
          <div className="flex-1">
            {title && (
              <h1 className="text-2xl font-semibold text-gradient-primary">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">
                {subtitle}
              </p>
            )}
          </div>

          {/* Right side - Actions and controls */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <Button variant="ghost" size="icon-sm" className="relative">
              <Search className="h-4 w-4" />
            </Button>

            {/* Notifications */}
            <Button variant="ghost" size="icon-sm" className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 h-2 w-2 bg-destructive rounded-full"></span>
            </Button>

            {/* Settings */}
            <Button variant="ghost" size="icon-sm">
              <Settings className="h-4 w-4" />
            </Button>

            {/* User Avatar */}
            <Button variant="ghost" size="icon-sm" className="relative">
              <User className="h-4 w-4" />
            </Button>

            {/* Custom Actions */}
            {actions}
          </div>
        </div>
      </div>
    </header>
  );
}

export default PremiumHeader;
