
import * as React from "react"

// Define breakpoints for different screen sizes
export const BREAKPOINTS = {
  xs: 480,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536
}

// Type for breakpoint keys
export type BreakpointKey = keyof typeof BREAKPOINTS;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    // Initial check
    const checkMobile = () => {
      const isTouchDevice = 'ontouchstart' in window || 
                           navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth < BREAKPOINTS.md;
      setIsMobile(isTouchDevice || isSmallScreen);
    }
    
    checkMobile();
    
    const handleResize = () => {
      checkMobile();
    }
    
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [])

  return !!isMobile
}

export function useBreakpoint(breakpoint: keyof typeof BREAKPOINTS) {
  const [isBelow, setIsBelow] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    // Check if we're in the browser environment
    if (typeof window === 'undefined') {
      return setIsBelow(false);
    }
    
    // Initial check
    const checkBreakpoint = () => {
      setIsBelow(window.innerWidth < BREAKPOINTS[breakpoint]);
    }
    
    checkBreakpoint();
    
    // Debounced resize handler for better performance
    let timeoutId: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkBreakpoint, 100);
    }
    
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timeoutId);
    }
  }, [breakpoint])

  return isBelow === undefined ? false : isBelow;
}

// Hook for getting the current breakpoint name
export function useCurrentBreakpoint() {
  const [current, setCurrent] = React.useState<keyof typeof BREAKPOINTS>("xs")
  
  React.useEffect(() => {
    // Check if we're in the browser environment
    if (typeof window === 'undefined') {
      return;
    }
    
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      
      if (width >= BREAKPOINTS["2xl"]) {
        setCurrent("2xl");
      } else if (width >= BREAKPOINTS.xl) {
        setCurrent("xl");
      } else if (width >= BREAKPOINTS.lg) {
        setCurrent("lg");
      } else if (width >= BREAKPOINTS.md) {
        setCurrent("md");
      } else if (width >= BREAKPOINTS.sm) {
        setCurrent("sm"); 
      } else {
        setCurrent("xs");
      }
    }
    
    // Debounced resize handler for better performance
    let timeoutId: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateBreakpoint, 100);
    }
    
    updateBreakpoint();
    window.addEventListener("resize", handleResize);
    
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timeoutId);
    }
  }, [])
  
  return current
}

// New hook to get all breakpoints at once for complex responsive conditions
export function useBreakpoints() {
  const isXs = useBreakpoint('xs');
  const isSm = useBreakpoint('sm');
  const isMd = useBreakpoint('md');
  const isLg = useBreakpoint('lg');
  const isXl = useBreakpoint('xl');
  const is2Xl = useBreakpoint('2xl');
  
  return {
    isXs,
    isSm,
    isMd, 
    isLg,
    isXl,
    is2Xl,
    // Utility functions
    isMobile: isXs || isSm,
    isTablet: isMd,
    isDesktop: isLg || isXl || is2Xl
  };
}
