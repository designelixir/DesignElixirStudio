'use client';

import { useState, FormEvent } from 'react';
import { createClient as createSupabaseClient } from '@/app/utils/supabase/client';
import { fetchClientWithProjects, clearSpecificCache } from '@/app/utils/clientUtils';
import { Client, Project } from '@/app/types/globalTypes';
import CreateProject from '../projects/CreateProject';
import Image from 'next/image';

interface EditClientProps {
  clientId: string;
  onClientUpdated: () => void;
}

interface CreateProjectProps {
  clientFirst: string;
  clientLast: string;
  clientId?: string; // Make it optional again
  onProjectCreated: (projectId: string) => void;
  onProjectUpdated?: () => void;
}

type TabType = 'info' | 'projects';

export default function EditClient({ clientId, onClientUpdated }: EditClientProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [client, setClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    client_first: '',
    client_last: '',
    client_email: '',
    client_phone: '',
    client_projects: [] as string[],
    client_notes: '',
    client_billable_rate: '' as string | number,
    client_drive: '',
    client_github: '',
    active: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);

  const loadClient = async () => {
    try {
      const { client, projects } = await fetchClientWithProjects(clientId);

      if (!client) throw new Error('Client not found');

      setClient(client);
      
      const projectIds = typeof client.client_projects === 'string' 
        ? JSON.parse(client.client_projects) 
        : client.client_projects || [];

      setFormData({
        client_first: client.client_first,
        client_last: client.client_last,
        client_email: client.client_email,
        client_phone: client.client_phone || '',
        client_projects: projectIds,
        client_notes: client.client_notes || '',
        client_billable_rate: client.client_billable_rate || '',
        client_drive: client.client_drive || '',
        client_github: client.client_github || '',
        active: client.active !== false,
      });

      setProjects(projects);
    } catch (err) {
      console.error('Error loading client:', err);
      setError('Failed to load client');
    }
  };

  const handleOpen = async () => {
    setIsOpen(true);
    setActiveTab('info');
    await loadClient();
  };

  const handleClose = () => {
    setIsOpen(false);
    setError('');
    setProjects([]);
  };

  const handleProjectCreated = async (projectId: string) => {
    const updatedProjects = [...formData.client_projects, projectId];
    
    const supabase = createSupabaseClient();
    await supabase
      .from('clients')
      .update({
        client_projects: JSON.stringify(updatedProjects)
      })
      .eq('id', clientId);

    clearSpecificCache('clients');
    clearSpecificCache('projects');
    await loadClient();
  };

  const handleProjectUpdated = async () => {
    clearSpecificCache('projects');
    await loadClient();
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const supabase = createSupabaseClient();

      const { error: updateError } = await supabase
        .from('clients')
        .update({
          client_first: formData.client_first,
          client_last: formData.client_last,
          client_email: formData.client_email,
          client_phone: formData.client_phone || null,
          client_projects: JSON.stringify(formData.client_projects),
          client_notes: formData.client_notes || null,
          client_billable_rate: formData.client_billable_rate ? Number(formData.client_billable_rate) : null,
          client_drive: formData.client_drive || null,
          client_github: formData.client_github || null,
          active: formData.active,
        })
        .eq('id', clientId);

      if (updateError) {
        throw updateError;
      }

      clearSpecificCache('clients');
      setLoading(false);
      handleClose();
      onClientUpdated();
    } catch (err: any) {
      console.error('Error updating client:', err);
      setError(err.message || 'Failed to update client');
      setLoading(false);
    }
  };

  return (
    <>
      <button onClick={handleOpen} className="icon-button">
        <Image src="/pencil.svg" alt="edit icon" width={25} height={25} />
      </button>

      {isOpen && (
        <div className="flex-center-center" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflow: 'auto',
            width: '90%'
          }}>
            <div className="flex-center-spacebetween">
              <h2>Edit Client</h2>
              <button type="button" onClick={handleClose}>✕</button>
            </div>

            <div className="flex-start-start" style={{ gap: '10px', marginBottom: '20px', borderBottom: '2px solid #e0e0e0' }}>
              <button 
                type="button" 
                onClick={() => setActiveTab('info')} 
                className={activeTab === 'info' ? 'tab-button tab-button-active' : 'tab-button'}
              >
                Client Info
              </button>
              <button 
                type="button" 
                onClick={() => setActiveTab('projects')} 
                className={activeTab === 'projects' ? 'tab-button tab-button-active' : 'tab-button'}
              >
                Projects ({projects.length})
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {activeTab === 'info' && (
                <div>
                  <div className='flex-start-start'>
                    <div className="flex-start-start flex-column form-input-wrapper">
                      <label>First Name *</label>
                      <input type="text" required value={formData.client_first} onChange={(e) => setFormData({ ...formData, client_first: e.target.value })} />
                    </div>
                    <div className="flex-start-start flex-column form-input-wrapper">
                      <label>Last Name *</label>
                      <input type="text" required value={formData.client_last} onChange={(e) => setFormData({ ...formData, client_last: e.target.value })} />
                    </div>
                  </div>

                  <div className="flex-start-start">
                    <div className="flex-start-start flex-column form-input-wrapper">
                      <label>Email *</label>
                      <input type="email" required value={formData.client_email} onChange={(e) => setFormData({ ...formData, client_email: e.target.value })} />
                    </div>

                    <div className='flex-start-start flex-column form-input-wrapper' style={{maxWidth: '30%'}}>
                      <label>Phone</label>
                      <input type="tel" value={formData.client_phone} onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })} />
                    </div>
                  </div>

                  <div className="flex-start-start flex-column form-input-wrapper">
                    <label>Billable Rate ($/hr)</label>
                    <input type="number" step="0.01" value={formData.client_billable_rate} onChange={(e) => setFormData({ ...formData, client_billable_rate: e.target.value })} placeholder="e.g., 150" />
                  </div>

                  <div className="flex-start-start flex-column form-input-wrapper">
                    <label>Google Drive Link</label>
                    <input 
                      type="url" 
                      value={formData.client_drive} 
                      onChange={(e) => setFormData({ ...formData, client_drive: e.target.value })} 
                      placeholder="https://drive.google.com/..."
                    />
                  </div>

                  <div className="flex-start-start flex-column form-input-wrapper">
                    <label>GitHub Link</label>
                    <input 
                      type="url" 
                      value={formData.client_github} 
                      onChange={(e) => setFormData({ ...formData, client_github: e.target.value })} 
                      placeholder="https://github.com/..."
                    />
                  </div>

                  <div className="flex-start-start flex-column form-input-wrapper full-width">
                    <label>Notes</label>
                    <textarea 
                      value={formData.client_notes} 
                      onChange={(e) => setFormData({ ...formData, client_notes: e.target.value })} 
                      placeholder="Additional notes about this client..."
                      rows={4}
                      className="full-width"
                    />
                  </div>

                  <div className="form-input-wrapper flex-start-start flex-column">
                    <label>Active Client</label>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={formData.active}
                        onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
              )}

              {activeTab === 'projects' && (
                <div>
                  {/* Display existing projects */}
                  {projects.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                      <h3>Current Projects</h3>
                      <div className="flex-start-start flex-column" style={{ gap: '10px' }}>
                        {projects.map((project) => (
                          <div 
                            key={project.id}
                            className="flex-center-spacebetween"
                            style={{
                              padding: '10px',
                              backgroundColor: 'var(--white-1)',
                              borderRadius: 'var(--br)'
                            }}
                          >
                            <div className="flex-center-start" style={{ gap: '10px' }}>
                              {project.client_image && (
                                <Image 
                                  src={project.client_image} 
                                  alt={project.project_name} 
                                  width={30} 
                                  height={30} 
                                  style={{ borderRadius: '50%', objectFit: 'cover' }} 
                                />
                              )}
                              <div className="circle" style={{ backgroundColor: project.color }} />
                              <div>
                                <strong>{project.project_name}</strong>
                                <div style={{ fontSize: '12px', color: '#666' }}>
                                  {project.hourly_rate ? `$${project.hourly_rate}/hr` : 'No rate'}
                                  {project.deadline && ` • Deadline: ${new Date(project.deadline).toLocaleDateString()}`}
                                  {!project.active && ' • Inactive'}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add/Edit Projects Component */}
                  <CreateProject 
                    clientFirst={formData.client_first}
                    clientLast={formData.client_last}
                    clientId={clientId}
                    onProjectCreated={handleProjectCreated}
                    onProjectUpdated={handleProjectUpdated}
                  />
                </div>
              )}

              {error && <div style={{ color: 'red', marginTop: '15px' }}>{error}</div>}
              
              <button type="submit" disabled={loading}>
                {loading ? 'Updating...' : 'Update Client'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}