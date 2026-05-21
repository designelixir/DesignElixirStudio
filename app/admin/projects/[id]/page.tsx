'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import { Project } from '@/app/admin/types/globalTypes';
import Link from 'next/link';
import EditProject from '../EditProject';
import TimeTrackedList from '@/app/admin/time-tracking/TimeTrackedList';
import TaskList from '../TaskList';

type TabType = 'time' | 'tasks' | 'invoices';

export default function ProjectDetailPage() {
  const params = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('time');

  useEffect(() => {
    loadProject();
  }, [params.id]);

  const loadProject = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', params.id)
        .single();

      if (error) throw error;
      setProject(data);
    } catch (err) {
      console.error('Error loading project:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) return <div>Loading...</div>;
  if (!project) return <div>Project not found</div>;

  const tabs: { id: TabType; label: string }[] = [
    { id: 'time', label: 'Time Tracking' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'invoices', label: 'Invoices' },
  ];

  return (
    <div className='full-width basic-padding full-width'>
      <div className='flex-center-spacebetween full-width'>
        
          <Link href="/admin/projects" className="no-link-styling"><h3 className='no-text-spacing'>PROJECTS</h3></Link>
        
          <Link href="/admin/invoices/create">
            <button>Create Invoice</button>
          </Link>
        
      </div>
      

      {/* Project Header */}
      <div className="flex-center-spacebetween flex-wrap full-width" style={{ marginBottom: '20px' }}>
        <div className='flex-start-start flex-column full-width' style={{ minWidth: '400px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
            <div
              className="circle"
              style={{
                backgroundColor: project.color || '#CCCCCC',
                width: '20px',
                height: '20px'
              }}
            />
            <h1 style={{ margin: 0 }}>{project.project_name}</h1>
            {!project.active && (
              <span style={{
                fontSize: '14px',
                color: '#ff9800',
                padding: '4px 12px',
                backgroundColor: '#fff3e0',
                borderRadius: '12px'
              }}>
                Inactive
              </span>
            )}
          </div>

          <Link
            href={`/admin/client-list/${project.client_id}`}
            className='flex-center-start no-link-styling contact-link'
          >
            <h3>{project.client_first} {project.client_last}</h3>
          </Link>

          {project.hourly_rate && (
            <div style={{ marginTop: '5px', color: '#666' }}>
              <strong>Rate:</strong> ${project.hourly_rate}/hr
            </div>
          )}

          {project.deadline && (
            <div style={{ marginTop: '5px', color: '#666' }}>
              <strong>Deadline:</strong> {formatDate(project.deadline)}
            </div>
          )}

          {project.last_active && (
            <div style={{ marginTop: '5px', color: '#666' }}>
              <strong>Last Active:</strong> {formatDate(project.last_active)}
            </div>
          )}

          <div style={{ marginTop: '5px', color: '#999', fontSize: '12px' }}>
            Created {formatDate(project.created_at)}
          </div>
        </div>

        <div className='flex-end-end full-width'>
          <EditProject projectId={project.id} onProjectUpdated={loadProject} />
        </div>
      </div>

      <hr />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid var(--white-1, #e0e0e0)', marginBottom: '24px' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={activeTab === tab.id ? 'tab-button tab-button-active' : 'tab-button'}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'time' && (
        <TimeTrackedList
          filterProjectIds={[project.id]}
          billableRate={project.hourly_rate}
          showCalculations={true}
          allowProjectSelection={false}
          loadStyle="fullList"
        />
      )}

      {activeTab === 'tasks' && (
        <TaskList projectId={project.id} showCategories={false} />
      )}

      {activeTab === 'invoices' && (
        <div style={{ padding: '20px 0', opacity: 0.5 }}>
          Invoices coming soon.
        </div>
      )}
    </div>
  );
}