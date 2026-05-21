'use client';

import { useState, FormEvent } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import { Task } from '@/app/admin/types/globalTypes';
import Image from 'next/image';

interface EditTaskProps {
  task: Task;
  onTaskUpdated: () => void;
}

export default function EditTask({ task, onTaskUpdated }: EditTaskProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    task_name: task.task_name,
    task_deadline: task.task_deadline || '',
    task_notes: task.task_notes || '',
    task_priority: task.task_priority?.toString() || '',
    task_status: task.task_status
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleOpen = () => {
    setFormData({
      task_name: task.task_name,
      task_deadline: task.task_deadline || '',
      task_notes: task.task_notes || '',
      task_priority: task.task_priority?.toString() || '',
      task_status: task.task_status
    });
    setError('');
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          task_name: formData.task_name,
          task_deadline: formData.task_deadline || null,
          task_notes: formData.task_notes || null,
          task_priority: formData.task_priority ? parseInt(formData.task_priority) : null,
          task_status: formData.task_status
        })
        .eq('task_id', task.task_id);

      if (updateError) throw updateError;

      setIsOpen(false);
      onTaskUpdated();
    } catch (err: any) {
      console.error('Error updating task:', err);
      setError(err.message || 'Failed to update task');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('task_id', task.task_id);

      if (deleteError) throw deleteError;

      setIsOpen(false);
      onTaskUpdated();
    } catch (err: any) {
      console.error('Error deleting task:', err);
      setError(err.message || 'Failed to delete task');
    }
  };

  return (
    <>
      <button onClick={handleOpen} className='time-bar-input system-button' title="Edit task">
        <Image src="/pencil.svg" alt="edit icon" width={25} height={25} />
      </button>

      {isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto',
            width: '90%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2>Edit Task</h2>
              <button type="button" onClick={handleClose}>✕</button>
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
                {formData.task_deadline && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, task_deadline: '' })}
                    style={{ marginTop: '5px', fontSize: '12px' }}
                    className="system-button"
                  >
                    Remove Deadline
                  </button>
                )}
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
                  {loading ? 'Updating...' : 'Update Task'}
                </button>
                <button type="button" onClick={handleDelete} className="system-button" style={{ color: 'red' }}>
                  Delete Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}