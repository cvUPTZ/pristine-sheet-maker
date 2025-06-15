
import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"
import React from "react"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  // Defensive context check to help with debugging
  const themeData = useTheme();
  if (!themeData) {
    throw new Error(
      "[ui/sonner] useTheme() returned null. This usually means <ThemeProvider> from next-themes is missing in your component tree."
    );
  }
  const { theme = "system" } = themeData;

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }

