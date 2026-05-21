'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface TimeEntriesContextType {
  refreshTrigger: number;
  triggerRefresh: () => void;
}

const TimeEntriesContext = createContext<TimeEntriesContextType | undefined>(undefined);

export function TimeEntriesProvider({ children }: { children: ReactNode }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <TimeEntriesContext.Provider value={{ refreshTrigger, triggerRefresh }}>
      {children}
    </TimeEntriesContext.Provider>
  );
}

export function useTimeEntries() {
  const context = useContext(TimeEntriesContext);
  if (context === undefined) {
    throw new Error('useTimeEntries must be used within a TimeEntriesProvider');
  }
  return context;
}