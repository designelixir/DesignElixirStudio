'use client';

import { useState, useEffect, FormEvent } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import { Client } from '@/app/admin/types/globalTypes';
import ColorSelector from '../components/ColorSelector';
import { getRandomColor } from '../components/ColorSelector';
import { clearSpecificCache } from '@/app/utils/clientUtils';

interface CreateProjectStandaloneProps {
  onProjectCreated: () => void;
  onClose: () => void;
}

export default function CreateProjectStandalone({ onProjectCreated, onClose }: CreateProjectStandaloneProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [formData, setFormData] = useState({
    client_id: '',
    project_name: '',
    hourly_rate: '',
    color: getRandomColor(),
    active: true,
    deadline: '',
    project_image: null as File | null
  });
  const [loading, setLoading] = useState(false);
  const [loadingClients, setLoadingClients] = useState(true);
  const [error, setError] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoadingClients(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('client_first', { ascending: true });

      if (error) {
        console.error('Error fetching clients:', error);
        setError('Failed to load clients');
        throw error;
      }
      
      setClients(data || []);
    } catch (err) {
      console.error('Error fetching clients:', err);
      setError('Failed to load clients');
    } finally {
      setLoadingClients(false);
    }
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.client_id) {
      setError('Please select a client');
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
      
      // Fetch the client directly from the database to ensure we have the latest data
      const { data: selectedClient, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', formData.client_id)
        .single();

      if (clientError || !selectedClient) {
        console.error('Client fetch error:', clientError);
        setError('Client not found');
        setLoading(false);
        return;
      }

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

      const { data: newProject, error: insertError } = await supabase
        .from('projects')
        .insert([{
          project_name: formData.project_name,
          client_first: selectedClient.client_first,
          client_last: selectedClient.client_last,
          client_id: formData.client_id,
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

      onProjectCreated();
    } catch (err: any) {
      console.error('Error creating project:', err);
      setError(err.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2>Create New Project</h2>
        <button type="button" onClick={onClose}>✕</button>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label>Client *</label>
          <select
            required
            value={formData.client_id}
            onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            disabled={loadingClients}
          >
            <option value="">
              {loadingClients ? 'Loading clients...' : 'Select a client'}
            </option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>
                {client.client_first} {client.client_last}
              </option>
            ))}
          </select>
          {clients.length === 0 && !loadingClients && (
            <p style={{ color: '#666', fontSize: '12px', marginTop: '5px' }}>
              No clients found. Create a client first.
            </p>
          )}
        </div>

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
            placeholder="e.g., Website Redesign"
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
            placeholder="Optional - leave blank to use client rate"
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
          <label>Deadline (Optional)</label>
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
          <button type="submit" disabled={loading || loadingClients}>
            {loading ? 'Creating...' : 'Create Project'}
          </button>
          <button type="button" className="system-button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}