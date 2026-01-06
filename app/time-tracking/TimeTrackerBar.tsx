'use client'
import { createClient } from '@/utils/supabase/client';
import SearchAndSelectClient from '../components/SearchAndSelectClient';
import SelectableCalendar from '../components/SelectableCalendar';
import { useTracking } from '@/app/context/TrackingContext';
import { useTimeTracker } from '@/app/context/TimeTrackerContext';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { SelectedClientData } from '@/types/globalTypes';

interface TimeTrackerBarProps {
  onEntrySaved?: () => void;
}

export default function TimeTrackerBar({ onEntrySaved }: TimeTrackerBarProps) {
  const { checkTrackingStatus } = useTracking();
  const {
    originalStartTime,
    setOriginalStartTime,
    elapsedSeconds,
    setElapsedSeconds,
    description,
    setDescription,
    currentEntryId,
    setCurrentEntryId,
    storageMode,
    setStorageMode,
    isLoading,
    error,
    setError,
    clearSessionState,
  } = useTimeTracker();

  const [billable, setBillable] = useState(false);
  const [selectedClient, setSelectedClient] = useState<SelectedClientData | null>(null);
  const [projectData, setProjectData] = useState<any>(null);
  const [clientData, setClientData] = useState<any>(null);

  const isRecording = !!originalStartTime;

  useEffect(() => {
    if (selectedClient && selectedClient.project_id) {
      fetchProjectAndClientData();
    }
  }, [selectedClient]);

  const fetchProjectAndClientData = async () => {
    if (!selectedClient) return;

    try {
      const supabase = createClient();
      
      const { data: client } = await supabase
        .from('clients')
        .select('*')
        .eq('id', selectedClient.client_id)
        .single();

      setClientData(client);

      if (selectedClient.project_id) {
        const { data: project } = await supabase
          .from('projects')
          .select('*')
          .eq('id', selectedClient.project_id)
          .single();

        setProjectData(project);
      }
    } catch (err) {
      console.error('Error fetching project/client data:', err);
    }
  };

  const updateProjectLastActive = async (projectId: string, date: Date) => {
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from('projects')
        .update({ last_active: date.toISOString() })
        .eq('id', projectId);

      if (updateError) {
        console.error('Error updating project last_active:', updateError);
      }
    } catch (err) {
      console.error('Error updating project last_active:', err);
    }
  };

  const updateClientLastActive = async (clientId: string, date: Date) => {
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from('clients')
        .update({ last_active: date.toISOString() })
        .eq('id', clientId);

      if (updateError) {
        console.error('Error updating client last_active:', updateError);
      }
    } catch (err) {
      console.error('Error updating client last_active:', err);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const buildProjectObject = () => {
    if (!selectedClient) return null;

    return {
      client_id: selectedClient.client_id,
      client_first: selectedClient.client_first,
      client_last: selectedClient.client_last,
      project_id: selectedClient.project_id,
      project_name: selectedClient.project_name,
      project_color: selectedClient.project_color,
      ...(projectData && {
        project_image: projectData.project_image,
        hourly_rate: projectData.hourly_rate,
        deadline: projectData.deadline,
        active: projectData.active
      })
    };
  };

  const handleStartOrSave = async () => {
    if (isRecording) {
      // Save the entry
      if (!selectedClient) {
        setError('Please select a client');
        return;
      }

      if (!description || description.trim() === '') {
        setError('Please add a description');
        return;
      }

      const endTime = new Date();
      const timeLapsed = Math.floor((endTime.getTime() - originalStartTime.getTime()) / 1000);

      try {
        if (storageMode === 'online') {
          const supabase = createClient();
          const { error: updateError } = await supabase
            .from('time-tracking')
            .update({
              start_time: originalStartTime.toISOString(),
              end_time: endTime.toISOString(),
              time_lapsed: timeLapsed,
              client_id: selectedClient.client_id,
              project_id: selectedClient.project_id || null,
              project: buildProjectObject(),
              description: description,
              tracking_finished: true,
              billable: billable
            })
            .eq('id', currentEntryId);

          if (updateError) throw updateError;

          // Update project's last_active date
          if (selectedClient.project_id) {
            await updateProjectLastActive(selectedClient.project_id, originalStartTime);
          }

          // Update client's last_active date
          await updateClientLastActive(selectedClient.client_id, originalStartTime);
          
          clearSessionState();
          setOriginalStartTime(null);
          setElapsedSeconds(0);
          setSelectedClient(null);
          setDescription('');
          setCurrentEntryId(null);
          setError('');
          setBillable(false);
          setProjectData(null);
          setClientData(null);
          
          await checkTrackingStatus();
          onEntrySaved?.();
        } else {
          if (!currentEntryId) {
            setError('No entry ID found');
            return;
          }
          
          const localData = {
            id: currentEntryId,
            start_time: originalStartTime.toISOString(),
            end_time: endTime.toISOString(),
            time_lapsed: timeLapsed,
            client_id: selectedClient.client_id,
            project_id: selectedClient.project_id || null,
            project: buildProjectObject(),
            description: description,
            tracking_finished: true,
            stored_locally: true,
            billable: billable
          };
          localStorage.setItem(currentEntryId, JSON.stringify(localData));
          
          // Update project's last_active date (for local storage too)
          if (selectedClient.project_id) {
            await updateProjectLastActive(selectedClient.project_id, originalStartTime);
          }

          // Update client's last_active date (for local storage too)
          await updateClientLastActive(selectedClient.client_id, originalStartTime);
          
          clearSessionState();
          setOriginalStartTime(null);
          setElapsedSeconds(0);
          setSelectedClient(null);
          setDescription('');
          setCurrentEntryId(null);
          setError('');
          setBillable(false);
          setProjectData(null);
          setClientData(null);
          
          onEntrySaved?.();
        }
      } catch (err: any) {
        console.error('Error saving entry:', err);
        setError(err.message || 'Failed to save entry');
      }
    } else {
      // Start the timer
      const now = new Date();
      setOriginalStartTime(now);
      setElapsedSeconds(0);
      setError('');

      try {
        const supabase = createClient();
        
        const { data: existingEntry } = await supabase
          .from('time-tracking')
          .select('id')
          .eq('tracking_finished', false)
          .limit(1)
          .single();

        if (existingEntry) {
          setError('You have an unfinished entry. Please complete it first.');
          setOriginalStartTime(null);
          return;
        }

        const { data, error: insertError } = await supabase
          .from('time-tracking')
          .insert([{
            start_time: now.toISOString(),
            tracking_finished: false,
            description: description,
            client_id: selectedClient?.client_id || null,
            project_id: selectedClient?.project_id || null,
            project: selectedClient ? buildProjectObject() : null,
            billable: billable
          }])
          .select()
          .single();

        if (insertError) throw insertError;

        setCurrentEntryId(data.id);
        setStorageMode('online');
        await checkTrackingStatus();
      } catch (err) {
        console.error('Error creating entry:', err);
        setStorageMode('local');
        const localId = `local-${Date.now()}`;
        setCurrentEntryId(localId);
        localStorage.setItem(localId, JSON.stringify({
          start_time: now.toISOString(),
          tracking_finished: false,
          billable: billable
        }));
      }
    }
  };

  const handleDelete = async () => {
    if (!currentEntryId) return;

    if (currentEntryId && storageMode === 'online') {
      try {
        const supabase = createClient();
        await supabase
          .from('time-tracking')
          .delete()
          .eq('id', currentEntryId);
      } catch (err) {
        console.error('Error deleting entry:', err);
      }
    } else if (currentEntryId && storageMode === 'local') {
      localStorage.removeItem(currentEntryId);
    }

    clearSessionState();
    
    setOriginalStartTime(null);
    setElapsedSeconds(0);
    setSelectedClient(null);
    setDescription('');
    setCurrentEntryId(null);
    setError('');
    setBillable(false);
    setProjectData(null);
    setClientData(null);
    await checkTrackingStatus();
  };

  const handleStartTimeChange = async (newDate: Date) => {
    const oldStartTime = originalStartTime;
    setOriginalStartTime(newDate);
    
    if (newDate) {
      const now = new Date();
      const diff = Math.floor((now.getTime() - newDate.getTime()) / 1000);
      setElapsedSeconds(diff > 0 ? diff : 0);
    }

    if (currentEntryId && storageMode === 'online') {
      try {
        const supabase = createClient();
        const { error: updateError } = await supabase
          .from('time-tracking')
          .update({
            start_time: newDate.toISOString()
          })
          .eq('id', currentEntryId);

        if (updateError) {
          console.error('Error updating start time:', updateError);
          setOriginalStartTime(oldStartTime);
        }
      } catch (err) {
        console.error('Error updating start time:', err);
        setOriginalStartTime(oldStartTime);
      }
    } else if (currentEntryId && storageMode === 'local') {
      const localData = localStorage.getItem(currentEntryId);
      if (localData) {
        const parsed = JSON.parse(localData);
        parsed.start_time = newDate.toISOString();
        localStorage.setItem(currentEntryId, JSON.stringify(parsed));
      }
    }
  };

  const toggleBillable = () => {
  setBillable(!billable);
};

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div id="timeTracker">
      <div className="time-tracker-wrapper flex-center-spacebetween" style={{border: error ? '2px solid red' : '2px solid #E7E8E8'}}>
        <div className="time-bar-input-wrapper flex-center-start full-width">
          <input className='time-bar-input' value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What are you working on?" style={{width: '40%'}}/>
          <SearchAndSelectClient selectedClient={selectedClient} onClientSelect={setSelectedClient} />
          <SelectableCalendar value={originalStartTime} onChange={handleStartTimeChange} label="Start Time" disabled={!isRecording} />
          <button onClick={toggleBillable} className="time-bar-input system-button" style={{ opacity: billable ? '1' : '0.25', fontSize: '32px', lineHeight: '0', marginTop: '2px', color: billable ? 'green' : 'black' }} > $ </button>
          <div className="circle" style={{ backgroundColor: storageMode === 'online' ? '#4CAF50' : '#FFD700' }} title={storageMode === 'online' ? 'Stored online' : 'Stored locally'} />
          
        </div>
        <div className="flex-center-end">
          <div className="time-tracker-time"> {formatTime(elapsedSeconds)}</div>
          <button onClick={handleStartOrSave} style={{ backgroundColor: isRecording ? '#4CAF50' : '#2196F3', }} >
            {isRecording ? 'Save Entry' : 'Start Timer'}
          </button>
          {isRecording && (
            <button onClick={handleDelete} className='time-bar-input system-button' title="Delete entry" >
              <Image src="/trash.svg" alt="trash icon" width={25} height={25} />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ color: 'red', marginBottom: '15px' }}>
          {error}
        </div>
      )}
    </div>
  );
}