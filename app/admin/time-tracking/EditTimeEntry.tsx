'use client';

import { useState, FormEvent } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import { TimeEntry } from '@/app/admin/types/globalTypes';
import SearchAndSelectClient from '../components/SearchAndSelectClient';
import SelectableCalendar from '../components/SelectableCalendar';
import Image from 'next/image';

interface EditTimeEntryProps {
  entry: TimeEntry;
  onEntryUpdated: () => void;
}

interface SelectedClientData {
  client_id: string;
  client_name: string;
  client_first: string;
  client_last: string;
  project_id: string;
  project_name: string;
  project_color: string;
  project_hourly: number;
}

export default function EditTimeEntry({ entry, onEntryUpdated }: EditTimeEntryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [description, setDescription] = useState(entry.description || '');
  const [selectedClient, setSelectedClient] = useState<SelectedClientData | null>(null);
  const [billable, setBillable] = useState(entry.billable !== false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [durationHours, setDurationHours] = useState<string>('0');
  const [durationMinutes, setDurationMinutes] = useState<string>('0');
  const [durationSeconds, setDurationSeconds] = useState<string>('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const parseProject = (project: any) => {
    if (!project) return null;
    if (typeof project === 'string') {
      try {
        return JSON.parse(project);
      } catch {
        return null;
      }
    }
    return project;
  };

  const calculateDuration = (start: Date, end: Date) => {
    const diffInSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);
    const hours = Math.floor(diffInSeconds / 3600);
    const minutes = Math.floor((diffInSeconds % 3600) / 60);
    const seconds = diffInSeconds % 60;
    return { hours, minutes, seconds, totalSeconds: diffInSeconds };
  };

  const handleOpen = () => {
    const project = parseProject(entry.project);
    const initialClient: SelectedClientData | null = project ? {
      client_id: project.client_id || entry.client_id || '',
      client_name: project.client_first && project.client_last 
        ? `${project.client_first} ${project.client_last}` 
        : '',
      client_first: project.client_first || '',
      client_last: project.client_last || '',
      project_id: project.project_id || '',
      project_name: project.project_name || '',
      project_color: project.project_color || '#CCCCCC', 
      project_hourly: project.hourly_rate || 50,
    } : null;

    const start = new Date(entry.start_time);
    const end = entry.end_time ? new Date(entry.end_time) : new Date();
    const duration = calculateDuration(start, end);

    setDescription(entry.description || '');
    setSelectedClient(initialClient);
    setBillable(entry.billable !== false);
    setStartTime(start);
    setEndTime(end);
    setDurationHours(duration.hours.toString());
    setDurationMinutes(duration.minutes.toString());
    setDurationSeconds(duration.seconds.toString());
    setError('');
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this time entry?')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase
        .from('time-tracking')
        .delete()
        .eq('id', entry.id);

      if (deleteError) throw deleteError;

      setIsOpen(false);
      onEntryUpdated();
    } catch (err: any) {
      console.error('Error deleting entry:', err);
      setError(err.message || 'Failed to delete entry');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTimeChange = (newStart: Date) => {
    setStartTime(newStart);
    if (endTime) {
      const duration = calculateDuration(newStart, endTime);
      setDurationHours(duration.hours.toString());
      setDurationMinutes(duration.minutes.toString());
      setDurationSeconds(duration.seconds.toString());
    }
  };

  const handleEndTimeChange = (newEnd: Date) => {
    setEndTime(newEnd);
    if (startTime) {
      const duration = calculateDuration(startTime, newEnd);
      setDurationHours(duration.hours.toString());
      setDurationMinutes(duration.minutes.toString());
      setDurationSeconds(duration.seconds.toString());
    }
  };

  const handleDurationChange = (hours: string, minutes: string, seconds: string) => {
    setDurationHours(hours);
    setDurationMinutes(minutes);
    setDurationSeconds(seconds);

    if (startTime) {
      const totalSeconds = 
        (parseInt(hours) || 0) * 3600 + 
        (parseInt(minutes) || 0) * 60 + 
        (parseInt(seconds) || 0);
      
      const newEnd = new Date(startTime.getTime() + totalSeconds * 1000);
      setEndTime(newEnd);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!startTime || !endTime) {
      setError('Start and end times are required');
      setLoading(false);
      return;
    }

    const totalSeconds = 
      (parseInt(durationHours) || 0) * 3600 + 
      (parseInt(durationMinutes) || 0) * 60 + 
      (parseInt(durationSeconds) || 0);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from('time-tracking')
        .update({
          description: description,
          client_id: selectedClient?.client_id || null,
          project: selectedClient ? {
            client_id: selectedClient.client_id,
            client_first: selectedClient.client_first,
            client_last: selectedClient.client_last,
            project_id: selectedClient.project_id,
            project_name: selectedClient.project_name,
            project_color: selectedClient.project_color
          } : null,
          billable: billable,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          time_lapsed: totalSeconds
        })
        .eq('id', entry.id);

      if (updateError) throw updateError;

      setIsOpen(false);
      onEntryUpdated();
    } catch (err: any) {
      console.error('Error updating entry:', err);
      setError(err.message || 'Failed to update entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button onClick={handleOpen} className='time-bar-input system-button' title="Edit entry" >
        <Image src="/pencil.svg" alt="edit icon" width={25} height={25} />
      </button>

      {isOpen && (
        <div className="module-popup-container flex-center-center">
          <div className="module-popup basic-padding br box-shadow">
            <div className='flex-center-spacebetween module-popup-header'>
              <h2>Edit Time Entry</h2>
              <button type="button" className='system-button' onClick={handleClose}><span style={{fontSize: '32px', lineHeight: '18px'}}>&times;</span></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className='label-wrapper'>
                <label>Description</label>
                <input type="text" required value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label>Client & Project</label>
                <SearchAndSelectClient
                  selectedClient={selectedClient}
                  onClientSelect={setSelectedClient}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label>Start Time</label>
                  <SelectableCalendar
                    value={startTime}
                    onChange={handleStartTimeChange}
                    label="Start Time"
                    showPassedTimeValue={true}
                  />
                  
                </div>
                <div style={{ flex: 1 }}>
                  <label>End Time</label>
                  <SelectableCalendar
                    value={endTime}
                    onChange={handleEndTimeChange}
                    label="End Time"
                    showPassedTimeValue={true}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label>Duration</label>
                <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                  <div>
                    <input
                      type="number"
                      min="0"
                      value={durationHours}
                      onChange={(e) => handleDurationChange(e.target.value, durationMinutes, durationSeconds)}
                      style={{ width: '60px', padding: '8px' }}
                    />
                    <span style={{ marginLeft: '5px' }}>hrs</span>
                  </div>
                  <div>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={durationMinutes}
                      onChange={(e) => handleDurationChange(durationHours, e.target.value, durationSeconds)}
                      style={{ width: '60px', padding: '8px' }}
                    />
                    <span style={{ marginLeft: '5px' }}>min</span>
                  </div>
                  <div>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={durationSeconds}
                      onChange={(e) => handleDurationChange(durationHours, durationMinutes, e.target.value)}
                      style={{ width: '60px', padding: '8px' }}
                    />
                    <span style={{ marginLeft: '5px' }}>sec</span>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    checked={billable}
                    onChange={(e) => setBillable(e.target.checked)}
                  />
                  Billable
                </label>
              </div>

              {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" disabled={loading}>
                  {loading ? 'Updating...' : 'Update Entry'}
                </button>
                <button 
                  type="button" 
                  onClick={handleDelete} 
                  disabled={loading}
                  className='system-button'
                  style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <Image src="/trash.svg" alt="delete icon" width={15} height={15} />
                  Delete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}