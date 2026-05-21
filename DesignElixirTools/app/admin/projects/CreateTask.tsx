'use client';

import { useState, FormEvent } from 'react';
import { createClient } from '@/app/utils/supabase/client';

interface CreateTaskProps {
  clientId?: string;
  projectId?: string;
  onTaskCreated: () => void;
  onClose: () => void;
}

export default function CreateTask({ clientId, projectId, onTaskCreated, onClose }: CreateTaskProps) {
  const [formData, setFormData] = useState({
    task_name: '',
    task_notes: '',
    task_deadline: '',
    task_priority: '',
    task_status: 'pending'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      const { error: insertError } = await supabase
        .from('tasks')
        .insert([{
          task_name: formData.task_name,
          client_id: clientId || null,
          project_id: projectId || null,
          task_notes: formData.task_notes || null,
          task_deadline: formData.task_deadline || null,
          task_priority: formData.task_priority ? parseInt(formData.task_priority) : null,
          task_status: formData.task_status
        }]);

      if (insertError) throw insertError;

      onTaskCreated();
    } catch (err: any) {
      console.error('Error creating task:', err);
      setError(err.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2>Create New Task</h2>
        <button type="button" onClick={onClose}>✕</button>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label>Task Name *</label>
          <input
            type="text"
            required
            value={formData.task_name}
            onChange={(e) => setFormData({ ...formData, task_name: e.target.value })}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Deadline</label>
          <input
            type="date"
            value={formData.task_deadline}
            onChange={(e) => setFormData({ ...formData, task_deadline: e.target.value })}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Priority (1-10)</label>
          <input
            type="number"
            min="1"
            max="10"
            value={formData.task_priority}
            onChange={(e) => setFormData({ ...formData, task_priority: e.target.value })}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Status *</label>
          <select
            required
            value={formData.task_status}
            onChange={(e) => setFormData({ ...formData, task_status: e.target.value })}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          >
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="on-hold">On Hold</option>
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Notes</label>
          <textarea
            value={formData.task_notes}
            onChange={(e) => setFormData({ ...formData, task_notes: e.target.value })}
            rows={4}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>

        {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Task'}
          </button>
          <button type="button" className="system-button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}