// projects/TaskList.tsx
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import { Checklist } from '@/app/types/globalTypes';
import TaskCard from './TaskCard';
import AddTask from './AddTask';

interface TaskListProps {
  projectId?: string;
  showCreateButton?: boolean;
  tableTitle?: string;
  showCategories?: boolean;
}

interface TaskWithDetails extends Checklist {
  projectName?: string;
  projectColor?: string;
}

type TaskBucket = 'today' | 'awaiting-feedback' | 'backburner' | 'to-do';

export default function TaskList({ projectId, tableTitle, showCreateButton = true, showCategories = true }: TaskListProps) {  const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [addingToBucket, setAddingToBucket] = useState<TaskBucket | null>(null);

  const hasFixedProject = !!projectId;

  const buckets: { id: TaskBucket; label: string }[] = [
    { id: 'today', label: 'Top Priority' },
    { id: 'to-do', label: 'To-Do' },
    { id: 'awaiting-feedback', label: 'Awaiting Feedback' },
    { id: 'backburner', label: 'Backburner' }
    
  ];

  useEffect(() => {
    fetchTasks();
  }, [projectId]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      let query = supabase
        .from('checklist')
        .select('*')
        .order('task_completed', { ascending: true })
        .order('task_deadline', { ascending: true, nullsFirst: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch project details for each task
      const tasksWithDetails = await Promise.all(
        (data || []).map(async (task) => {
          let projectName = '';
          let projectColor = '';

          if (task.project_id) {
            const { data: project, error: projectError } = await supabase
              .from('projects')
              .select('project_name, color')
              .eq('id', task.project_id)
              .single();

            if (project && !projectError) {
              projectName = project.project_name;
              projectColor = project.color || '#CCCCCC';
            }
          }

          return {
            ...task,
            task_bucket: task.task_bucket || 'other',
            projectName,
            projectColor
          };
        })
      );

      setTasks(tasksWithDetails);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (bucket: TaskBucket) => {
    if (!draggedTask) return;

    try {
      // Optimistically update UI
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === draggedTask 
            ? { ...task, task_bucket: bucket }
            : task
        )
      );

      const supabase = createClient();
      const { error } = await supabase
        .from('checklist')
        .update({ task_bucket: bucket })
        .eq('id', draggedTask);

      if (error) throw error;
      
      setDraggedTask(null);
    } catch (err) {
      console.error('Error updating task bucket:', err);
      // Revert on error
      fetchTasks();
    }
  };

  const handleTaskAdded = () => {
    setAddingToBucket(null);
    fetchTasks();
  };

  const handleTaskUpdate = (updatedTask: Partial<Checklist> & { id: string }) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === updatedTask.id
          ? { ...task, ...updatedTask }
          : task
      )
    );
  };

  const getTasksByBucket = (bucket: TaskBucket) => {
    return tasks.filter(task => task.task_bucket === bucket && !task.task_completed);
  };

  if (loading) {
    return <div>Loading tasks...</div>;
  }

  return (
    <div className='flex-start-start flex-column full-width'>
      {showCategories ? (
        <div className='bucket-container full-width'>
          {buckets.map(bucket => (
            <div className='basic-padding bucket-wrapper' key={bucket.id} onDragOver={handleDragOver} onDrop={() => handleDrop(bucket.id)}>
              <h4 className='no-text-spacing'><strong>{bucket.label} ({getTasksByBucket(bucket.id).length})</strong></h4>

              <div className='bucket-wrapper-list' style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '10px' }}>
                {getTasksByBucket(bucket.id).map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    hasFixedProject={hasFixedProject}
                    onUpdate={handleTaskUpdate}
                    onDragStart={setDraggedTask}
                  />
                ))}
              </div>

              {showCreateButton && (
                <div style={{ marginTop: '10px' }}>
                  {addingToBucket === bucket.id ? (
                    <AddTask
                      bucket={bucket.id}
                      projectId={projectId}
                      onTaskAdded={handleTaskAdded}
                      onCancel={() => setAddingToBucket(null)}
                    />
                  ) : (
                    <button
                      onClick={() => setAddingToBucket(bucket.id)}
                      style={{ width: '100%', padding: '10px', backgroundColor: 'white', border: '2px dashed #ccc', borderRadius: '6px', cursor: 'pointer', color: '#666', fontSize: '13px' }}
                    >
                      + Add Task
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className='flex-start-start flex-column full-width' style={{ gap: '10px' }}>
          {tasks.filter(t => !t.task_completed).map(task => (
            <TaskCard
              key={task.id}
              task={task}
              hasFixedProject={hasFixedProject}
              onUpdate={handleTaskUpdate}
              onDragStart={setDraggedTask}
            />
          ))}
          {tasks.filter(t => !t.task_completed).length === 0 && (
            <p style={{ opacity: 0.5 }}>No tasks yet.</p>
          )}
        </div>
      )}
    </div>
  );
}