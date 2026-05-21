'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/app/utils/supabase/client';
import { Client, Project } from '@/app/admin/types/globalTypes';
import ClientList from './ClientList';
import CreateClient from './CreateClient';
import { fetchProjects } from '@/app/utils/clientUtils';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeClientsCount, setActiveClientsCount] = useState(0);

  const fetchClients = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching clients:', error);
        return;
      }

      setClients(data || []);
      await calculateActiveClients(data || []);
    } catch (err) {
      console.error('Error fetching clients:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateActiveClients = async (clientsList: Client[]) => {
    try {
      const allProjects = await fetchProjects();
      
      let count = 0;
      clientsList.forEach(client => {
        const clientProjectIds = typeof client.client_projects === 'string' 
          ? JSON.parse(client.client_projects) 
          : client.client_projects || [];
        
        const clientProjects = allProjects.filter(p => clientProjectIds.includes(p.id));
        const hasActiveProjects = clientProjects.some(p => p.active !== false);
        
        if (hasActiveProjects) {
          count++;
        }
      });
      
      setActiveClientsCount(count);
    } catch (err) {
      console.error('Error calculating active clients:', err);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleClientCreated = () => {
    fetchClients();
    setShowCreateModal(false);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className='flex-start-start flex-column basic-padding'>
      <div className='flex-center-spacebetween full-width'>
        <div>
          <h1>Clients</h1>
          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
            {activeClientsCount} / {clients.length} clients with active projects
          </p>
        </div>
        <button onClick={() => setShowCreateModal(true)}>+ Add Client</button>
      </div>

      <ClientList 
        clients={clients} 
        refreshClients={fetchClients}
      />

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
            padding: '20px',
            borderRadius: '8px',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <CreateClient
              onClientCreated={handleClientCreated}
              onClose={() => setShowCreateModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}