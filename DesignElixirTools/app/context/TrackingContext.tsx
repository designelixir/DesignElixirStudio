'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@/app/utils/supabase/client';

interface TrackingContextType {
  hasActiveTracking: boolean;
  checkTrackingStatus: () => Promise<void>;
}

const TrackingContext = createContext<TrackingContextType | undefined>(undefined);

export function TrackingProvider({ children }: { children: ReactNode }) {
  const [hasActiveTracking, setHasActiveTracking] = useState(false);

  const checkTrackingStatus = async () => {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from('time-tracking')
      .select('id')
      .eq('tracking_finished', false)
      .limit(1)
      .single();

    const isTracking = !!data;
    setHasActiveTracking(isTracking);

    // Update favicon based on tracking status
    if (typeof window !== 'undefined') {
      const favicon = document.querySelector("link[rel='icon']") as HTMLLinkElement;
      if (favicon) {
        favicon.href = isTracking ? '/favicon-active.ico' : '/favicon.ico';
      }
    }
  } catch (err) {
    console.error('Error checking tracking status:', err);
    setHasActiveTracking(false);
  }
};

  // Check status on mount
  useEffect(() => {
    checkTrackingStatus();
  }, []);

  return (
    <TrackingContext.Provider value={{ hasActiveTracking, checkTrackingStatus }}>
      {children}
    </TrackingContext.Provider>
  );
}

export function useTracking() {
  const context = useContext(TrackingContext);
  if (context === undefined) {
    throw new Error('useTracking must be used within a TrackingProvider');
  }
  return context;
}