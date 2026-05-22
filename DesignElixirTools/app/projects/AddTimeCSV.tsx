'use client';

import { useState } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import SearchAndSelectClient from '../components/SearchAndSelectClient';
import { SelectedClientData } from '@/app/types/globalTypes';

export default function AddTimeCSV() {
  const [selectedClient, setSelectedClient] = useState<SelectedClientData | null>(null);
  const [pastedData, setPastedData] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [projectData, setProjectData] = useState<any>(null);

  const fetchProjectData = async () => {
    if (!selectedClient || !selectedClient.project_id) return;

    try {
      const supabase = createClient();
      const { data: project } = await supabase
        .from('projects')
        .select('*')
        .eq('id', selectedClient.project_id)
        .single();

      setProjectData(project);
    } catch (err) {
      console.error('Error fetching project data:', err);
    }
  };

  useState(() => {
    if (selectedClient) {
      fetchProjectData();
    }
  });

  const parseDateTime = (dateStr: string, timeStr: string): string => {
    // Expected format: MM/DD/YYYY and HH:MM AM/PM
    const [month, day, year] = dateStr.split('/');
    
    // Parse time (handles both 12-hour and 24-hour format)
    let hours = 0;
    let minutes = 0;
    
    if (timeStr.includes('AM') || timeStr.includes('PM')) {
      const isPM = timeStr.includes('PM');
      const timeOnly = timeStr.replace(/AM|PM/gi, '').trim();
      const [h, m] = timeOnly.split(':');
      hours = parseInt(h);
      minutes = parseInt(m) || 0;
      
      if (isPM && hours !== 12) hours += 12;
      if (!isPM && hours === 12) hours = 0;
    } else {
      const [h, m] = timeStr.split(':');
      hours = parseInt(h);
      minutes = parseInt(m) || 0;
    }
    
    // Create date in local timezone
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), hours, minutes);
    return date.toISOString();
  };

  const calculateTimeLapsed = (startTime: string, endTime: string): number => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    return Math.floor((end.getTime() - start.getTime()) / 1000);
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

  const handleSubmit = async () => {
    if (!selectedClient) {
      setError('Please select a client and project');
      return;
    }

    if (!pastedData.trim()) {
      setError('Please paste your time data');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const supabase = createClient();
      
      // Parse pasted data
      const rows = pastedData.trim().split('\n');
      const entries = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        // Skip empty rows
        if (!row.trim()) continue;

        // Split by tab (from spreadsheet paste)
        const columns = row.split('\t');
        
        if (columns.length < 6) {
          console.warn(`Skipping row ${i + 1}: Not enough columns`);
          continue;
        }

        const [description, billableStr, startDate, startTime, endDate, endTime] = columns;

        // Parse dates and times
        const startDateTime = parseDateTime(startDate.trim(), startTime.trim());
        const endDateTime = parseDateTime(endDate.trim(), endTime.trim());
        const timeLapsed = calculateTimeLapsed(startDateTime, endDateTime);
        
        // Parse billable
        const billable = billableStr.trim().toLowerCase() === 'yes' || 
                        billableStr.trim().toLowerCase() === 'true' ||
                        billableStr.trim() === '1';

        // Create entry
        const entry = {
          created_at: startDateTime,
          start_time: startDateTime,
          end_time: endDateTime,
          time_lapsed: timeLapsed,
          client_id: selectedClient.client_id,
          project_id: selectedClient.project_id ? parseInt(selectedClient.project_id) : null,
          description: description.trim() || 'No notes',
          tracking_finished: true,
          invoice_id: null,
          billable: billable,
          project: buildProjectObject()
        };

        entries.push(entry);
      }

      if (entries.length === 0) {
        setError('No valid entries found. Make sure data is tab-separated.');
        setLoading(false);
        return;
      }

      // Insert all entries
      const { error: insertError } = await supabase
        .from('time-tracking')
        .insert(entries);

      if (insertError) throw insertError;

      setSuccess(`Successfully added ${entries.length} time entries!`);
      setPastedData('');
      setSelectedClient(null);
      setProjectData(null);
    } catch (err: any) {
      console.error('Error adding time entries:', err);
      setError(err.message || 'Failed to add time entries');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='flex-start-start'>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Select Client & Project *
          </label>
          <SearchAndSelectClient
            selectedClient={selectedClient}
            onClientSelect={(client) => {
              setSelectedClient(client);
              if (client) fetchProjectData();
            }}
          />
        </div>
        
        {error && (
          <div style={{ 
            color: 'red', 
            backgroundColor: '#ffebee', 
            padding: '10px', 
            borderRadius: '4px', 
            marginBottom: '15px' 
          }}>
            {error}
          </div>
        )}
        
        {success && (
          <div style={{ 
            color: 'green', 
            backgroundColor: '#e8f5e9', 
            padding: '10px', 
            borderRadius: '4px', 
            marginBottom: '15px' 
          }}>
            {success}
          </div>
        )}
        
        <button 
          onClick={handleSubmit} 
          disabled={loading || !selectedClient || !pastedData.trim()}
          style={{ backgroundColor: loading ? '#ccc' : '#2196F3' }}
        >
          {loading ? 'Importing...' : 'Import Time Entries'}
        </button>
      </div>
      
      <div className='flex-start-start flex-column' style={{marginLeft: '25px'}}>
        <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
          Copy and paste from your spreadsheet with these columns:<br />
          <strong>Description | Billable | Start Date | Start Time | End Date | End Time</strong>
        </p>
        <textarea
          value={pastedData}
          onChange={(e) => setPastedData(e.target.value)}
          placeholder="Paste your spreadsheet data here (tab-separated)...&#10;Example:&#10;Website updates	Yes	12/26/2025	09:00 AM	12/26/2025	11:30 AM&#10;Client meeting	No	12/26/2025	02:00 PM	12/26/2025	03:00 PM"
          rows={10}
          style={{
            width: '100%',
            padding: '10px',
            fontFamily: 'monospace',
            fontSize: '12px',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
        />
        <p style={{ fontSize: '11px', color: '#999', marginTop: '5px' }}>
          {pastedData.trim().split('\n').filter(r => r.trim()).length} rows pasted
        </p>
      </div>
    </div>
  );
}