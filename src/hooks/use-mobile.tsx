
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

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    // Initial check
    setIsMobile(window.innerWidth < BREAKPOINTS.md)
    
    const handleResize = () => {
      setIsMobile(window.innerWidth < BREAKPOINTS.md)
    }
    
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return !!isMobile
}

export function useBreakpoint(breakpoint: keyof typeof BREAKPOINTS) {
  const [isBelow, setIsBelow] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    // Initial check
    setIsBelow(window.innerWidth < BREAKPOINTS[breakpoint])
    
    const handleResize = () => {
      setIsBelow(window.innerWidth < BREAKPOINTS[breakpoint])
    }
    
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [breakpoint])

  return !!isBelow
}

// New hook for getting the current breakpoint name
export function useCurrentBreakpoint() {
  const [current, setCurrent] = React.useState<keyof typeof BREAKPOINTS>("xs")
  
  React.useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth
      if (width >= BREAKPOINTS["2xl"]) {
        setCurrent("2xl")
      } else if (width >= BREAKPOINTS.xl) {
        setCurrent("xl")
      } else if (width >= BREAKPOINTS.lg) {
        setCurrent("lg")
      } else if (width >= BREAKPOINTS.md) {
        setCurrent("md")
      } else if (width >= BREAKPOINTS.sm) {
        setCurrent("sm") 
      } else {
        setCurrent("xs")
      }
    }
    
    updateBreakpoint()
    window.addEventListener("resize", updateBreakpoint)
    return () => window.removeEventListener("resize", updateBreakpoint)
  }, [])
  
  return current
}
