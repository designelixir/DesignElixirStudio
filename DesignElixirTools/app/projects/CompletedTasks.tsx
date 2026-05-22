'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import SearchAndSelectClient from '../components/SearchAndSelectClient';
import { SelectedClientData, Checklist } from '@/app/types/globalTypes';

interface Project {
  id: string;
  project_name: string;
  project_color: string;
  client_first: string;
  client_last: string;
  client_id: string;
}

interface CompletedTaskWithProject extends Checklist {
  project?: Project;
}

export default function CompletedTasksList() {
  const [tasks, setTasks] = useState<CompletedTaskWithProject[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<CompletedTaskWithProject[]>([]);
  const [selectedClient, setSelectedClient] = useState<SelectedClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCompletedTasks();
  }, []);

  useEffect(() => {
    filterTasks();
  }, [tasks, selectedClient]);

  const fetchCompletedTasks = async () => {
    try {
      const supabase = createClient();
      
      // Fetch completed tasks
      const { data: checklistData, error: checklistError } = await supabase
        .from('checklist')
        .select('*')
        .eq('task_completed', true)
        .order('created_at', { ascending: false });

      if (checklistError) {
        console.error('Supabase error:', checklistError);
        setError(checklistError.message);
        throw checklistError;
      }

      // Fetch all projects to map to tasks
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*');

      if (projectsError) {
        console.error('Projects fetch error:', projectsError);
      }

      // Map projects to tasks
      const tasksWithProjects = (checklistData || []).map(task => {
        const project = projectsData?.find(p => p.id === task.project_id);
        return {
          ...task,
          project: project || undefined
        };
      });

      console.log('Fetched tasks with projects:', tasksWithProjects);
      setTasks(tasksWithProjects);
    } catch (err: any) {
      console.error('Error fetching completed tasks:', err);
      setError(err?.message || 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  const filterTasks = () => {
    if (!selectedClient) {
      setFilteredTasks(tasks);
      return;
    }

    const filtered = tasks.filter(task => {
      if (!task.project) return false;
      
      if (selectedClient.project_id) {
        return task.project.id === selectedClient.project_id;
      } else {
        return task.project.client_id === selectedClient.client_id;
      }
    });

    setFilteredTasks(filtered);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const clearFilter = () => {
    setSelectedClient(null);
  };

  if (loading) {
    return <div>Loading completed tasks...</div>;
  }

  if (error) {
    return (
      <div style={{ color: 'red', padding: '20px' }}>
        Error loading completed tasks: {error}
      </div>
    );
  }

  return (
    <div className="full-width">
      <div className="flex-center-spacebetween" style={{ marginBottom: '20px' }}>
        <h2>Completed Tasks ({filteredTasks.length})</h2>
        <div className="flex-center-end" style={{ gap: '10px' }}>
          <SearchAndSelectClient 
            selectedClient={selectedClient} 
            onClientSelect={setSelectedClient}
          />
          {selectedClient && (
            <button onClick={clearFilter} className="system-button">
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <p style={{ color: '#666', textAlign: 'center', padding: '40px' }}>
          {selectedClient 
            ? 'No completed tasks found for this client/project'
            : 'No completed tasks yet'}
        </p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
              <th style={{ textAlign: 'left', padding: '12px' }}>Task</th>
              <th style={{ textAlign: 'left', padding: '12px' }}>Client</th>
              <th style={{ textAlign: 'left', padding: '12px' }}>Project</th>
              <th style={{ textAlign: 'left', padding: '12px' }}>Deadline</th>
              <th style={{ textAlign: 'left', padding: '12px' }}>Completed</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.map((task) => (
              <tr 
                key={task.id} 
                style={{ borderBottom: '1px solid #e0e0e0' }}
              >
                <td style={{ padding: '12px' }}>
                  {task.task_description}
                </td>
                <td style={{ padding: '12px' }}>
                  {task.project ? (
                    `${task.project.client_first} ${task.project.client_last}`
                  ) : (
                    <span style={{ color: '#999' }}>No client</span>
                  )}
                </td>
                <td style={{ padding: '12px' }}>
                  {task.project ? (
                    <div className="flex-center-start" style={{ gap: '8px' }}>
                      <div 
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: task.project.project_color || '#ccc'
                        }}
                      />
                      {task.project.project_name}
                    </div>
                  ) : (
                    <span style={{ color: '#999' }}>No project</span>
                  )}
                </td>
                <td style={{ padding: '12px' }}>
                  {formatDate(task.task_deadline)}
                </td>
                <td style={{ padding: '12px' }}>
                  {formatDate(task.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}