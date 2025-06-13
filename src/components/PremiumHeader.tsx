
import React from 'react';
import { Button } from '@/components/ui/button';
import { Bell, Search, Settings, User } from 'lucide-react';
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
      "sticky top-0 z-50 border-b border-border/50 backdrop-blur-xl",
      "bg-background/80 supports-[backdrop-filter]:bg-background/60",
      "shadow-sm",
      className
    )}>
      <div className="modern-container">
        <div className="flex items-center justify-between py-4">
          {/* Left side - Title and subtitle */}
          <div className="flex-1 min-w-0">
            {title && (
              <h1 className="text-2xl font-bold text-gradient-primary truncate">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1 truncate">
                {subtitle}
              </p>
            )}
          </div>

          {/* Right side - Actions and controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Search */}
            <Button 
              variant="ghost" 
              size="icon-sm" 
              className="relative hover:bg-muted/80 rounded-xl"
            >
              <Search className="h-4 w-4" />
            </Button>

            {/* Notifications */}
            <Button 
              variant="ghost" 
              size="icon-sm" 
              className="relative hover:bg-muted/80 rounded-xl"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 h-2 w-2 bg-destructive rounded-full animate-pulse"></span>
            </Button>

            {/* Settings */}
            <Button 
              variant="ghost" 
              size="icon-sm"
              className="hover:bg-muted/80 rounded-xl"
            >
              <Settings className="h-4 w-4" />
            </Button>

            {/* User Avatar */}
            <Button 
              variant="ghost" 
              size="icon-sm" 
              className="relative hover:bg-muted/80 rounded-xl"
            >
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
