
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PremiumCardProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'gradient' | 'elevated';
  size?: 'sm' | 'default' | 'lg';
}

export function PremiumCard({ 
  title, 
  description, 
  children, 
  footer, 
  className, 
  variant = 'default',
  size = 'default'
}: PremiumCardProps) {
  const variants = {
    default: '',
    glass: 'bg-white/10 backdrop-blur-md border-white/20',
    gradient: 'bg-gradient-to-br from-card via-card to-muted/20 border-primary/20',
    elevated: 'shadow-premium-lg hover:shadow-xl hover:-translate-y-2'
  };

  const sizes = {
    sm: 'p-4',
    default: 'p-6',
    lg: 'p-8'
  };

  return (
    <Card className={cn(
      variants[variant],
      className
    )}>
      {(title || description) && (
        <CardHeader className={sizes[size]}>
          {title && <CardTitle className="text-xl">{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      
      <CardContent className={cn(
        sizes[size],
        (title || description) && 'pt-0'
      )}>
        {children}
      </CardContent>
      
      {footer && (
        <CardFooter className={sizes[size]}>
          {footer}
        </CardFooter>
      )}
    </Card>
  );
}

export default PremiumCard;
