'use client';

import { useState, FormEvent } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import { Project } from '@/app/admin/types/globalTypes';
import ColorSelector from '../components/ColorSelector';
import Image from 'next/image';

interface EditProjectProps {
  projectId: string;
  onProjectUpdated: () => void;
}

export default function EditProject({ projectId, onProjectUpdated }: EditProjectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({
    project_name: '',
    hourly_rate: '',
    color: '#5C5CAD',
    active: true,
    deadline: '',
    project_image: null as File | null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const loadProject = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;

      setProject(data);
      setFormData({
        project_name: data.project_name,
        hourly_rate: data.hourly_rate?.toString() || '',
        color: data.color || '#5C5CAD',
        active: data.active !== false,
        deadline: data.deadline || '',
        project_image: null
      });
      setImagePreview(data.project_image || null);
    } catch (err) {
      console.error('Error loading project:', err);
      setError('Failed to load project');
    }
  };

  const handleOpen = async () => {
    setIsOpen(true);
    await loadProject();
  };

  const handleClose = () => {
    setIsOpen(false);
    setError('');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, project_image: file });
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      let imageUrl = project?.client_image || '';

      if (formData.project_image) {
        const fileExt = formData.project_image.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('client-images')
          .upload(fileName, formData.project_image);

        if (uploadError) {
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('client-images')
          .getPublicUrl(fileName);
        
        imageUrl = publicUrl;
      }

      const { error: updateError } = await supabase
        .from('projects')
        .update({
          project_name: formData.project_name,
          hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
          color: formData.color,
          active: formData.active,
          deadline: formData.deadline || null,
          project_image: imageUrl || null
        })
        .eq('id', projectId);

      if (updateError) {
        throw updateError;
      }

      setLoading(false);
      handleClose();
      onProjectUpdated();
    } catch (err: any) {
      console.error('Error updating project:', err);
      setError(err.message || 'Failed to update project');
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;

      handleClose();
      onProjectUpdated();
    } catch (err: any) {
      console.error('Error deleting project:', err);
      setError(err.message || 'Failed to delete project');
    }
  };

  return (
    <>
      <button onClick={handleOpen} className="icon-button">
        <Image src="/pencil.svg" alt="edit icon" width={25} height={25} />
      </button>

      {isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
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
            <div className="flex-center-spacebetween">
              <h2>Edit Project</h2>
              <button type="button" onClick={handleClose}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '15px' }}>
                <label>Project Image</label>
                <div className="add-client-image-preview-wrapper flex-end-end" style={{backgroundImage: imagePreview ? `url("${imagePreview}")` : 'url("/default.svg")'}}>
                  <input className="input-no-border browse-image-input" type="file" accept="image/*" onChange={handleImageChange} />
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label>Project Name *</label>
                <input
                  type="text"
                  required
                  value={formData.project_name}
                  onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                  style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label>Hourly Rate ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                  style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label>Project Color *</label>
                <ColorSelector
                  selectedColor={formData.color}
                  onColorChange={(color) => setFormData({ ...formData, color })}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label>Deadline</label>
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  />
                  Active Project
                </label>
              </div>

              {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" disabled={loading}>
                  {loading ? 'Updating...' : 'Update Project'}
                </button>
                <button type="button" onClick={handleDelete} className="system-button" style={{ color: 'red' }}>
                  Delete Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}