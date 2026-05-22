'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import { Project } from '@/app/types/globalTypes';
import Link from 'next/link';
import SelectableCalendar from '../components/SelectableCalendar';
import EditProject from './EditProject';

export default function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('active', { ascending: false })
        .order('project_name', { ascending: true });

      if (error) throw error;
      setProjects(data || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (projectId: string, currentActive: boolean) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('projects')
        .update({ active: !currentActive })
        .eq('id', projectId);

      if (error) throw error;
      fetchProjects();
    } catch (err) {
      console.error('Error toggling active status:', err);
    }
  };

  const handleDeadlineChange = async (projectId: string, newDate: Date | null) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('projects')
        .update({ 
          deadline: newDate ? newDate.toISOString().split('T')[0] : null 
        })
        .eq('id', projectId);

      if (error) throw error;
      fetchProjects();
    } catch (err) {
      console.error('Error updating deadline:', err);
    }
  };

  const handleLastActiveChange = async (projectId: string, newDate: Date | null) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('projects')
        .update({ 
          last_active: newDate ? newDate.toISOString() : null 
        })
        .eq('id', projectId);

      if (error) throw error;
      fetchProjects();
    } catch (err) {
      console.error('Error updating last active:', err);
    }
  };

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  if (loading) {
    return <div>Loading projects...</div>;
  }

  if (projects.length === 0) {
    return <div>No projects yet. Create your first project!</div>;
  }

  return (
    <div className='flex-start-start flex-column full-width'>
      <table className='full-width'>
        <thead>
          <tr>
            <th>Project</th>
            <th>Client</th>
            <th>Hourly Rate</th>
            <th>Active</th>
            <th>Deadline</th>
            <th>Last Active</th>
            <th>Edit</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr key={project.id} style={{opacity: project.active ? '1' : '0.5'}}>
              <td>
                <Link 
                  href={`/projects/${project.id}`}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    textDecoration: 'none',
                    color: 'inherit'
                  }}
                >
                  <div 
                    className="circle" 
                    style={{ backgroundColor: project.color || '#CCCCCC' }}
                  />
                  <h3>{project.project_name}</h3>
                </Link>
              </td>
              <td>
                <Link href={`/client-list/${project.client_id}`} > {project.client_first} {project.client_last} </Link>
              </td>
              <td>
                {project.hourly_rate ? `$${project.hourly_rate}/hr` : 'Not set'}
              </td>
              <td>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={project.active || false}
                    onChange={() => handleToggleActive(project.id, project.active || false)}
                  />
                  <span className="slider"></span>
                </label>
              </td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <SelectableCalendar
                    value={project.deadline ? new Date(project.deadline) : null}
                    onChange={(date) => handleDeadlineChange(project.id, date)}
                    label="Deadline"
                  />
                  <span>{formatDate(project.deadline)}</span>
                </div>
              </td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <SelectableCalendar
                    value={project.last_active ? new Date(project.last_active) : null}
                    onChange={(date) => handleLastActiveChange(project.id, date)}
                    label="Last Active"
                  />
                  <span>{formatDate(project.last_active)}</span>
                </div>
              </td>
              <td>
                <EditProject projectId={project.id} onProjectUpdated={fetchProjects} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}