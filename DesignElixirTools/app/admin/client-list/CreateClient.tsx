'use client';

import { useState, FormEvent } from 'react';
import { createClient as createSupabaseClient } from '@/app/utils/supabase/client';
import CreateProject from '../projects/CreateProject';
import Image from 'next/image';

interface CreateClientProps {
  onClientCreated: () => void;
  onClose: () => void;
}

type TabType = 'info' | 'projects';

export default function CreateClient({ onClientCreated, onClose }: CreateClientProps) {
  const [activeTab, setActiveTab] = useState<TabType>('info');
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
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [projects, setProjects] = useState<any[]>([]);

  const handleProjectCreated = async (projectId: string) => {
    setFormData({
      ...formData,
      client_projects: [...formData.client_projects, projectId]
    });

    const supabase = createSupabaseClient();
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (data) {
      setProjects([...projects, data]);
    }
  };

  const handleRemoveProject = async (projectId: string) => {
    const supabase = createSupabaseClient();
    await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    setFormData({
      ...formData,
      client_projects: formData.client_projects.filter(id => id !== projectId)
    });
    setProjects(projects.filter(p => p.id !== projectId));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const supabase = createSupabaseClient();

      const { data: clientData, error: insertError } = await supabase
        .from('clients')
        .insert([{
          client_first: formData.client_first,
          client_last: formData.client_last,
          client_email: formData.client_email,
          client_phone: formData.client_phone || null,
          client_projects: JSON.stringify(formData.client_projects),
          client_notes: formData.client_notes || null,
          client_billable_rate: formData.client_billable_rate ? Number(formData.client_billable_rate) : null,
          client_drive: formData.client_drive || null,
          client_github: formData.client_github || null,
        }])
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // Update all created projects with the client_id
      if (formData.client_projects.length > 0) {
        const { error: updateError } = await supabase
          .from('projects')
          .update({ client_id: clientData.id })
          .in('id', formData.client_projects);

        if (updateError) {
          console.error('Error updating projects with client_id:', updateError);
        }
      }

      setLoading(false);
      onClientCreated();
    } catch (err: any) {
      console.error('Error creating client:', err);
      setError(err.message || 'Failed to create client');
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex-center-spacebetween">
        <h2>Add New Client</h2>
        <button type="button" onClick={onClose}>✕</button>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #e0e0e0' }}>
        <button type="button" onClick={() => setActiveTab('info')} className={activeTab === 'info' ? 'tab-button tab-button-active' : 'tab-button'} >
          Client Info
        </button>
        <button type="button" onClick={() => setActiveTab('projects')} className={activeTab === 'projects' ? 'tab-button tab-button-active' : 'tab-button'} >
          Projects ({formData.client_projects.length})
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

            <div className="flex-start-start flex-column" style={{margin: '10px'}}>
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
          </div>
        )}

        {activeTab === 'projects' && (
          <div>

            {projects.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <h3>Created Projects</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {projects.map((project) => (
                    <div key={project.id} className='card flex-center-spacebetween' >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className='circle' style={{ backgroundColor: project.color }} />
                        <div>
                          <p><strong>{project.project_name}</strong> </p>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {project.hourly_rate ? `$${project.hourly_rate}/hr` : 'No rate set'} 
                            {project.deadline && ` • Deadline: ${new Date(project.deadline).toLocaleDateString()}`}
                            {!project.active && ' • Inactive'}
                          </div>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveProject(project.id)} 
                        className='icon-button'
                      >
                        <Image src="/trash.svg" alt="trash icon" width={15} height={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <CreateProject 
              clientFirst={formData.client_first}
              clientLast={formData.client_last}
              
              onProjectCreated={handleProjectCreated}
            />

            
          </div>
        )}

        {error && <div style={{ color: 'red', marginTop: '15px' }}>{error}</div>}
        
        <button type="submit" disabled={loading} style={{ marginTop: '20px' }}>
          {loading ? 'Creating...' : 'Create Client'}
        </button>
      </form>
    </div>
  );
}