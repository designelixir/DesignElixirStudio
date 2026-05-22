'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import { Client } from '../types/globalTypes';

interface ActiveSession {
  originalStartTime: string;
  selectedClient: Client | null;
  description: string;
  currentEntryId: string;
  storageMode: 'online' | 'local';
}

interface TimeTrackerContextType {
  originalStartTime: Date | null;
  setOriginalStartTime: (date: Date | null) => void;
  elapsedSeconds: number;
  setElapsedSeconds: (seconds: number) => void;
  selectedClient: Client | null;
  setSelectedClient: (client: Client | null) => void;
  description: string;
  setDescription: (desc: string) => void;
  currentEntryId: string | null;
  setCurrentEntryId: (id: string | null) => void;
  storageMode: 'online' | 'local';
  setStorageMode: (mode: 'online' | 'local') => void;
  isLoading: boolean;
  error: string;
  setError: (error: string) => void;
  refreshTracker: () => void;
  saveSessionState: () => void;
  clearSessionState: () => void;
}

const TimeTrackerContext = createContext<TimeTrackerContextType | undefined>(undefined);

export function TimeTrackerProvider({ children }: { children: ReactNode }) {
  const [originalStartTime, setOriginalStartTime] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [description, setDescription] = useState('');
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);
  const [storageMode, setStorageMode] = useState<'online' | 'local'>('online');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Load active session on mount
  useEffect(() => {
    loadActiveSession();
  }, []);

  // Save session state whenever it changes
  useEffect(() => {
    if (originalStartTime && currentEntryId) {
      saveSessionState();
    }
  }, [originalStartTime, selectedClient, description, currentEntryId, storageMode]);

  // Timer interval
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (originalStartTime) {
      interval = setInterval(() => {
        const now = new Date();
        const diff = Math.floor((now.getTime() - originalStartTime.getTime()) / 1000);
        setElapsedSeconds(diff);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [originalStartTime]);

  const saveSessionState = () => {
    if (!originalStartTime || !currentEntryId) return;

    const session: ActiveSession = {
      originalStartTime: originalStartTime.toISOString(),
      selectedClient,
      description,
      currentEntryId,
      storageMode
    };

    localStorage.setItem('active_time_session', JSON.stringify(session));
  };

  const clearSessionState = () => {
    localStorage.removeItem('active_time_session');
  };

  const loadActiveSession = async () => {
    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('time-tracking')
        .select('*')
        .eq('tracking_finished', false)
        .order('start_time', { ascending: false })
        .limit(1)
        .single();

      if (data && !fetchError) {
        const start = new Date(data.start_time);
        setOriginalStartTime(start);
        setCurrentEntryId(data.id);
        setDescription(data.description || '');
        setStorageMode('online');
        
        const now = new Date();
        const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
        setElapsedSeconds(diff);
        
        if (data.client_id) {
          const { data: clientData } = await supabase
            .from('clients')
            .select('*')
            .eq('id', data.client_id)
            .single();
          
          if (clientData) {
            setSelectedClient(clientData);
          }
        }
        
        setIsLoading(false);
        return;
      }

      const sessionData = localStorage.getItem('active_time_session');
      if (sessionData) {
        const session: ActiveSession = JSON.parse(sessionData);
        const originalStart = new Date(session.originalStartTime);
        setOriginalStartTime(originalStart);
        
        setSelectedClient(session.selectedClient);
        setDescription(session.description);
        setCurrentEntryId(session.currentEntryId);
        setStorageMode(session.storageMode);
        
        const now = new Date();
        const diff = Math.floor((now.getTime() - originalStart.getTime()) / 1000);
        setElapsedSeconds(diff);
      }
    } catch (err) {
      console.error('Error loading active session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshTracker = () => {
    loadActiveSession();
  };

  return (
    <TimeTrackerContext.Provider
      value={{
        originalStartTime,
        setOriginalStartTime,
        elapsedSeconds,
        setElapsedSeconds,
        selectedClient,
        setSelectedClient,
        description,
        setDescription,
        currentEntryId,
        setCurrentEntryId,
        storageMode,
        setStorageMode,
        isLoading,
        error,
        setError,
        refreshTracker,
        saveSessionState,
        clearSessionState,
      }}
    >
      {children}
    </TimeTrackerContext.Provider>
  );
}

export function useTimeTracker() {
  const context = useContext(TimeTrackerContext);
  if (context === undefined) {
    throw new Error('useTimeTracker must be used within a TimeTrackerProvider');
  }
  return context;
}