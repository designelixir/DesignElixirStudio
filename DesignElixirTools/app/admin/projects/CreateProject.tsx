'use client';

import { useState } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import { clearSpecificCache } from '@/app/utils/clientUtils';
import ColorSelector from '../components/ColorSelector';
import { getRandomColor } from '../components/ColorSelector';

interface CreateProjectProps {
  clientFirst: string;
  clientLast: string;
  clientId?: string;
  onProjectCreated: (projectId: string) => void;
  onProjectUpdated?: () => void; // Make it optional
}

export default function CreateProject({ clientFirst, clientLast, clientId, onProjectCreated }: CreateProjectProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [formData, setFormData] = useState({
    project_name: '',
    hourly_rate: '',
    color: getRandomColor(),
    active: true,
    deadline: '',
    project_image: null as File | null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

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

  const handleAddProject = async () => {
    setLoading(true);
    setError('');

    if (!clientFirst || !clientLast) {
      setError('Please fill in client name in the Client Info tab first');
      setLoading(false);
      return;
    }

    if (!formData.project_name) {
      setError('Project name is required');
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      let imageUrl = '';

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

      const { data, error: insertError } = await supabase
        .from('projects')
        .insert([{
          project_name: formData.project_name,
          client_first: clientFirst,
          client_last: clientLast,
          client_id: clientId || null,
          hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
          color: formData.color,
          active: formData.active,
          deadline: formData.deadline || null,
          project_image: imageUrl || null,
          last_active: new Date().toISOString()
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      clearSpecificCache('projects');

      setFormData({
        project_name: '',
        hourly_rate: '',
        color: getRandomColor(),
        active: true,
        deadline: '',
        project_image: null
      });
      setImagePreview(null);
      setIsExpanded(false);

      onProjectCreated(data.id);
    } catch (err: any) {
      console.error('Error creating project:', err);
      setError(err.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsExpanded(false);
    setError('');
    setFormData({
      project_name: '',
      hourly_rate: '',
      color: getRandomColor(),
      active: true,
      deadline: '',
      project_image: null
    });
    setImagePreview(null);
  };

  return (
    <div style={{ marginBottom: '20px', border: '1px solid #e0e0e0', borderRadius: '4px', padding: '15px' }}>
      <div 
        className="flex-center-start"
        style={{ cursor: 'pointer', gap: '10px' }}
        onClick={() => !isExpanded && setIsExpanded(true)}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="icon-button"
          style={{
            fontSize: '20px',
            width: '24px',
            height: '24px'
          }}
        >
          {isExpanded ? '−' : '+'}
        </button>
        <h3 className="no-text-spacing">Add Project for {clientFirst} {clientLast}</h3>
      </div>

      {isExpanded && (
        <div style={{ marginTop: '15px' }}>
          <div className="flex-start-start">
            <div className="form-input-wrapper">
              <label>Project Image</label>
              <div className="add-client-image-preview-wrapper flex-end-end" style={{backgroundImage: imagePreview ? `url("${imagePreview}")` : 'url("/default.svg")'}}>
                <input className="input-no-border browse-image-input" type="file" accept="image/*" onChange={handleImageChange} />
              </div>
            </div>
            <div className="flex-start-start flex-column">
              <div className="form-input-wrapper">
                <label>Project Name *</label>
                <input
                  type="text"
                  value={formData.project_name}
                  onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                  placeholder="e.g., Website Redesign"
                />
              </div>
              <div className="form-input-wrapper">
                <label>Project Color *</label>
                <ColorSelector selectedColor={formData.color} onColorChange={(color) => setFormData({ ...formData, color })} />
              </div>
              <div className="form-input-wrapper">
                <label>Hourly Rate ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                  placeholder="Optional - leave blank to use client rate"
                />
              </div>
            </div>
          </div>
          
          <div className="form-input-wrapper">
            <label>Deadline (Optional)</label>
            <input
              type="date"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
            />
          </div>

          <div className="form-input-wrapper flex-start-start flex-column">
            <label>Active Project</label>
            <label className="switch">
                <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                />
                <span className="slider"></span>
            </label>
            </div>

          {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}

          <div className="flex-start-start" style={{ gap: '10px' }}>
            <button type="button" onClick={handleAddProject} disabled={loading}>
              {loading ? 'Adding...' : 'Add Project'}
            </button>
            <button type="button" className="system-button" onClick={handleCancel} disabled={loading}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}