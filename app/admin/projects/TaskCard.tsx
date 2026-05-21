// components/TaskCard.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Checklist } from '@/app/admin/types/globalTypes';
import { createClient } from '@/app/utils/supabase/client';
import SelectableCalendar from '../components/SelectableCalendar';

interface TaskCardProps {
  task: Checklist & {
    projectName?: string;
    projectColor?: string;
  };
  hasFixedProject: boolean;
  onUpdate?: (updatedTask: Partial<Checklist> & { id: string }) => void;
  onDragStart?: (taskId: string) => void;
}

export default function TaskCard({ 
  task, 
  hasFixedProject,
  onUpdate,
  onDragStart
}: TaskCardProps) {
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editedTask, setEditedTask] = useState(task);
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditedTask(task);
  }, [task]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        if (isEditing) {
          handleSave();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditing, editedTask]);

  const handleSave = async () => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('checklist')
        .update({
          task_description: editedTask.task_description,
          task_deadline: editedTask.task_deadline,
          task_status: editedTask.task_status,
          task_bucket: editedTask.task_bucket
        })
        .eq('id', task.id);

      if (error) throw error;

      setIsEditing(null);
      if (onUpdate) {
        onUpdate({
          id: task.id,
          task_description: editedTask.task_description,
          task_deadline: editedTask.task_deadline,
          task_status: editedTask.task_status,
          task_bucket: editedTask.task_bucket
        });
      }
    } catch (err) {
      console.error('Error updating task:', err);
    }
  };

  const handleToggleComplete = async () => {
    try {
      const supabase = createClient();
      const newCompletedState = !task.task_completed;
      const newStatus = newCompletedState ? 'completed' : 'pending';
      
      const { error } = await supabase
        .from('checklist')
        .update({ 
          task_completed: newCompletedState,
          task_status: newStatus
        })
        .eq('id', task.id);

      if (error) throw error;
      
      if (onUpdate) {
        onUpdate({
          id: task.id,
          task_completed: newCompletedState,
          task_status: newStatus
        });
      }
    } catch (err) {
      console.error('Error toggling completion:', err);
    }
  };

  const formatDeadline = (deadline: string | null): string => {
    if (!deadline) return 'No deadline';
    
    const date = new Date(deadline);
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

  const getDaysTillDeadline = (deadline: string | null): string => {
    if (!deadline) return '';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return '1 day';
    return `${diffDays} days`;
  };

  const getDeadlineStatus = (deadline: string | null): string => {
    if (!deadline) return '';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'overdue';
    if (diffDays <= 3) return 'urgent';
    if (diffDays <= 5) return 'coming-up';
    return 'on-track';
  };

  const handleDeadlineChange = (date: Date) => {
    setEditedTask({ ...editedTask, task_deadline: date.toISOString() });
    setIsEditing(null);
  };

  return (
    <div ref={cardRef} draggable onDragStart={(e) => { setIsDragging(true); if (onDragStart) { onDragStart(task.id); } }} onDragEnd={() => setIsDragging(false)} className={`card deadline-border ${task.task_bucket} ${getDeadlineStatus(task.task_deadline) ? ` ${getDeadlineStatus(task.task_deadline)}` : ''}`} style={{ opacity: isDragging ? 0.5 : task.task_completed ? 0.6 : 1, cursor: 'grab' }} >
      <div className='flex-start-spacebetween'>
            {!hasFixedProject && task.projectName && (
                <div className='client-tag-wrapper' style={{marginBottom: '10px'}}>
                    <div className='circle-small' style={{ backgroundColor: task.projectColor || '#CCCCCC' }} />
                    <p className='no-text-spacing'>{task.projectName}</p>
                </div>
            )}
            <div onMouseDown={(e) => e.stopPropagation()} draggable={false}>
            {isEditing === 'deadline' ? (
            <div onClick={(e) => e.stopPropagation()}>
                <SelectableCalendar
                value={editedTask.task_deadline ? new Date(editedTask.task_deadline) : null}
                onChange={handleDeadlineChange}
                label="Deadline"
                />
            </div>
            ) : (
            <div className='deadline-date' onClick={(e) => { e.stopPropagation(); setIsEditing('deadline'); }} style={{ cursor: 'pointer' }}>
                {editedTask.task_deadline ? ( <p className='no-text-spacing small-text'> {getDaysTillDeadline(editedTask.task_deadline)}</p> ) : ( <span>📅</span> )}
            </div>
            )}
        </div>
      </div>
      <div className='flex-center-start'>
        
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={task.task_completed}
          onChange={handleToggleComplete}
          onClick={(e) => e.stopPropagation()}
          style={{ cursor: 'pointer', marginRight: '8px' }}
        />
        

        {/* Task Description */}
        {isEditing === 'task_description' ? (
          <input
            
            type="text"
            value={editedTask.task_description}
            onChange={(e) => setEditedTask({ ...editedTask, task_description: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        ) : (
          <strong className='deadline-bubble' onClick={() => setIsEditing('task_description')} >
            {editedTask.task_description}
          </strong>
        )}
      </div>


      {/* Status */}
      {/* <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '11px'
      }}>
        {isEditing === 'status' ? (
          <select
            value={editedTask.task_status}
            onChange={(e) => {
              setEditedTask({ ...editedTask, task_status: e.target.value });
              setIsEditing('status');
            }}
            onClick={(e) => e.stopPropagation()}
            autoFocus
            style={{ fontSize: '11px' }}
          >
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="on-hold">On Hold</option>
          </select>
        ) : (
          <span 
            style={{ color: '#666', cursor: 'pointer' }}
            onClick={() => setIsEditing('status')}
          >
            {editedTask.task_status}
          </span>
        )}
      </div> */}
    </div>
  );
}