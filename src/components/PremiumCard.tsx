
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PremiumCardProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'gradient' | 'elevated' | 'modern';
  size?: 'sm' | 'default' | 'lg';
}

export function PremiumCard({ 
  title, 
  description, 
  children, 
  footer, 
  className, 
  variant = 'modern',
  size = 'default'
}: PremiumCardProps) {
  const variants = {
    default: 'bg-card',
    glass: 'glass',
    gradient: 'bg-gradient-to-br from-card via-card to-muted/20 border-primary/20',
    elevated: 'shadow-modern-lg hover:shadow-xl hover:-translate-y-2',
    modern: 'modern-card'
  };

  const sizes = {
    sm: 'p-4',
    default: 'p-6',
    lg: 'p-8'
  };

  return (
    <Card className={cn(
      variants[variant],
      'transition-all duration-300 hover:scale-[1.02]',
      className
    )}>
      {(title || description) && (
        <CardHeader className={cn(sizes[size], 'pb-4')}>
          {title && (
            <CardTitle className="text-xl font-semibold text-foreground">
              {title}
            </CardTitle>
          )}
          {description && (
            <CardDescription className="text-muted-foreground">
              {description}
            </CardDescription>
          )}
        </CardHeader>
      )}
      
      <CardContent className={cn(
        sizes[size],
        (title || description) && 'pt-0'
      )}>
        {children}
      </CardContent>
      
      {footer && (
        <CardFooter className={cn(sizes[size], 'pt-4')}>
          {footer}
        </CardFooter>
      )}
    </Card>
  );
}

export default PremiumCard;
