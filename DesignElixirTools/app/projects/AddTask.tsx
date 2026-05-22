// components/AddTask.tsx
'use client';

import { useState } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import SearchAndSelectClient from '../components/SearchAndSelectClient';
import SelectableCalendar from '../components/SelectableCalendar';
import { SelectedClientData } from '@/app/types/globalTypes';

interface AddTaskProps {
  bucket: string;
  projectId?: string;
  onTaskAdded: () => void;
  onCancel: () => void;
}

export default function AddTask({ bucket, projectId, onTaskAdded, onCancel }: AddTaskProps) {
  const [taskDescription, setTaskDescription] = useState('');
  const [selectedClient, setSelectedClient] = useState<SelectedClientData | null>(null);
  const [deadline, setDeadline] = useState<Date | null>(() => {
    // Default to 7 days from now
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    return sevenDaysFromNow;
  });
  const [showCalendar, setShowCalendar] = useState(false);
  const [loading, setLoading] = useState(false);

  const hasFixedProject = !!projectId;

  const handleSubmit = async () => {
    if (!taskDescription.trim()) {
      alert('Task description is required');
      return;
    }

    const targetProjectId = hasFixedProject ? projectId : selectedClient?.project_id;

    if (!targetProjectId) {
      alert('Please select a project');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('checklist')
        .insert([{
          project_id: targetProjectId,
          task_description: taskDescription,
          task_bucket: bucket,
          task_status: 'pending',
          task_completed: false,
          task_order: Date.now(),
          task_deadline: deadline ? deadline.toISOString() : null
        }]);

      if (error) throw error;

      setTaskDescription('');
      setSelectedClient(null);
      setDeadline(() => {
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        return sevenDaysFromNow;
      });
      setShowCalendar(false);
      onTaskAdded();
    } catch (err: any) {
      console.error('Error creating task:', err);
      alert(err.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleSubmit();
    }
  };

  const handleDeadlineChange = (date: Date) => {
    setDeadline(date);
    setShowCalendar(false);
  };

  const formatDeadline = (date: Date | null): string => {
    if (!date) return 'Set deadline';
    
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    const year = date.getFullYear();
    
    const suffix = (day: number) => {
      if (day > 3 && day < 21) return 'th';
      switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
      }
    };

    return `${month} ${day}${suffix(day)}, ${year}`;
  };

  return (
    <div style={{ 
      backgroundColor: 'white',
      padding: '12px',
      borderRadius: '6px',
      border: '2px dashed #4CAF50'
    }}>
      {!hasFixedProject && (
        <div style={{ marginBottom: '8px' }}>
          <SearchAndSelectClient
            selectedClient={selectedClient}
            onClientSelect={setSelectedClient}
          />
        </div>
      )}
      <input
        type="text"
        placeholder="Task description..."
        value={taskDescription}
        onChange={(e) => setTaskDescription(e.target.value)}
        onKeyPress={handleKeyPress}
        disabled={loading}
        style={{ 
          width: '100%', 
          padding: '8px',
          marginBottom: '8px',
          fontSize: '13px'
        }}
        autoFocus
      />
      
      {/* Deadline */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '10px',
        marginBottom: '8px',
        fontSize: '12px'
      }}>
        {!deadline || showCalendar ? (
          <SelectableCalendar
            value={deadline}
            onChange={handleDeadlineChange}
            label="Deadline"
          />
        ) : (
          <span 
            onClick={() => setShowCalendar(true)}
            style={{ cursor: 'pointer', color: '#666' }}
          >
            📅 {formatDeadline(deadline)}
          </span>
        )}
        {deadline && !showCalendar && (
          <button
            onClick={() => setDeadline(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#999',
              cursor: 'pointer',
              fontSize: '11px',
              textDecoration: 'underline'
            }}
          >
            Clear
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '5px' }}>
        <button 
          onClick={handleSubmit}
          disabled={loading}
          style={{ flex: 1, padding: '6px', fontSize: '12px' }}
        >
          {loading ? 'Adding...' : 'Add'}
        </button>
        <button 
          onClick={onCancel}
          disabled={loading}
          className="system-button"
          style={{ flex: 1, padding: '6px', fontSize: '12px' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}