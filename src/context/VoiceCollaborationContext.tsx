
import React, { createContext, useContext, ReactNode } from 'react';
import { useNewVoiceCollaboration } from '@/hooks/useNewVoiceCollaboration';

// Prepare the context value type based on the hook return
type VoiceCollabContextType = ReturnType<typeof useNewVoiceCollaboration>;

const VoiceCollaborationContext = createContext<VoiceCollabContextType | undefined>(undefined);

export const VoiceCollaborationProvider = ({ children }: { children: ReactNode }) => {
  const value = useNewVoiceCollaboration();
  return (
    <VoiceCollaborationContext.Provider value={value}>
      {children}
    </VoiceCollaborationContext.Provider>
  );
};

export function useVoiceCollaborationContext() {
  const context = useContext(VoiceCollaborationContext);
  if (!context) {
    throw new Error('useVoiceCollaborationContext must be used within a VoiceCollaborationProvider');
  }
  return context;
}
