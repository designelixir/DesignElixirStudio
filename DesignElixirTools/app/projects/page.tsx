'use client';

import { useState, useEffect } from 'react';
import ProjectList from './ProjectList';
import CreateProjectStandalone from './CreateProjectStandalone';
import { fetchProjects } from '@/app/utils/clientUtils';

export default function ProjectsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeProjectsCount, setActiveProjectsCount] = useState(0);
  const [totalProjectsCount, setTotalProjectsCount] = useState(0);

  useEffect(() => {
    loadProjectCounts();
  }, [refreshKey]);

  const loadProjectCounts = async () => {
    try {
      const projects = await fetchProjects();
      const activeProjects = projects.filter(p => p.active !== false);
      
      setActiveProjectsCount(activeProjects.length);
      setTotalProjectsCount(projects.length);
    } catch (err) {
      console.error('Error loading project counts:', err);
    }
  };

  const handleProjectCreated = () => {
    setShowCreateModal(false);
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className='full-width basic-padding'>
      <div className="flex-center-spacebetween" style={{ marginBottom: '20px' }}>
        <div>
          <h1>Projects</h1>
          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
            {activeProjectsCount} / {totalProjectsCount} active projects
          </p>
        </div>

        <button onClick={() => setShowCreateModal(true)}>
          + Add Project
        </button>
      </div>

      <ProjectList key={refreshKey} />

      {showCreateModal && (
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
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <CreateProjectStandalone
              onProjectCreated={handleProjectCreated}
              onClose={() => setShowCreateModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}