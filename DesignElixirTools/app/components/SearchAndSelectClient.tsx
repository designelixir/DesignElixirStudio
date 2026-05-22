'use client'
import { useState, useEffect, useRef } from 'react';
import { fetchClients, fetchProjects } from '@/app/utils/clientUtils';
import { Client, Project, SelectedClientData } from '../types/globalTypes';

interface SearchAndSelectClientProps {
  selectedClient: SelectedClientData | null;
  onClientSelect: (clientData: SelectedClientData | null) => void;
}

interface ClientWithProjects extends Client {
  projects?: Project[];
}

export default function SearchAndSelectClient({ selectedClient, onClientSelect }: SearchAndSelectClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState<ClientWithProjects[]>([]);
  const [filteredClients, setFilteredClients] = useState<ClientWithProjects[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [selectedClientForProjects, setSelectedClientForProjects] = useState<ClientWithProjects | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredClients(sortClientsByActiveProjects(clients));
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = clients.filter(client => {
        const nameMatch = client.client_first.toLowerCase().includes(term) ||
                         client.client_last.toLowerCase().includes(term) ||
                         client.client_email.toLowerCase().includes(term);
        
        const projectMatch = client.projects?.some(p => 
          p.project_name.toLowerCase().includes(term)
        ) || false;
        
        return nameMatch || projectMatch;
      });
      setFilteredClients(sortClientsByActiveProjects(filtered));
    }
  }, [searchTerm, clients]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowProjectPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sortClientsByActiveProjects = (clientsList: ClientWithProjects[]) => {
    return [...clientsList].sort((a, b) => {
      const aActiveProjects = (a.projects || []).filter(p => p.active !== false);
      const bActiveProjects = (b.projects || []).filter(p => p.active !== false);
      
      const aHasActive = aActiveProjects.length > 0;
      const bHasActive = bActiveProjects.length > 0;
      
      // Clients with active projects come first
      if (aHasActive && !bHasActive) return -1;
      if (!aHasActive && bHasActive) return 1;
      
      // If both have active projects, sort by number of active projects (descending)
      if (aHasActive && bHasActive) {
        const diff = bActiveProjects.length - aActiveProjects.length;
        if (diff !== 0) return diff;
      }
      
      // Finally sort alphabetically by first name
      return a.client_first.localeCompare(b.client_first);
    });
  };

  const loadClients = async () => {
    try {
      const [clientsData, allProjects] = await Promise.all([
        fetchClients(true), // Force refresh
        fetchProjects(true)  // Force refresh
      ]);

      const clientsWithProjects = clientsData.map(client => {
        const projectIds = typeof client.client_projects === 'string' 
          ? JSON.parse(client.client_projects) 
          : client.client_projects || [];

        const clientProjects = allProjects.filter(p => projectIds.includes(p.id));

        return { ...client, projects: clientProjects };
      });

      const sortedClients = sortClientsByActiveProjects(clientsWithProjects);
      setClients(sortedClients);
      setFilteredClients(sortedClients);
    } catch (err) {
      console.error('Error loading clients:', err);
    }
  };

  const handleClientClick = (client: ClientWithProjects) => {
    const projects = client.projects || [];
    
    if (projects.length === 0) {
      onClientSelect({
        client_id: client.id,
        client_name: `${client.client_first} ${client.client_last}`,
        client_first: client.client_first,
        client_last: client.client_last,
        project_id: '',
        project_name: 'No Project',
        project_color: '#CCCCCC',
        project_hourly: 50,
      });
      setSearchTerm('');
      setIsOpen(false);
    } else if (projects.length === 1) {
      onClientSelect({
        client_id: client.id,
        client_name: `${client.client_first} ${client.client_last}`,
        client_first: client.client_first,
        client_last: client.client_last,
        project_id: projects[0].id,
        project_name: projects[0].project_name,
        project_color: projects[0].color || '#CCCCCC',
        project_hourly: projects[0].hourly_rate || 50,
      });
      setSearchTerm('');
      setIsOpen(false);
    } else {
      setSelectedClientForProjects(client);
      setShowProjectPicker(true);
      setIsOpen(false);
    }
  };

  const handleProjectSelect = (project: Project) => {
    if (!selectedClientForProjects) return;
    
    onClientSelect({
      client_id: selectedClientForProjects.id,
      client_name: `${selectedClientForProjects.client_first} ${selectedClientForProjects.client_last}`,
      client_first: selectedClientForProjects.client_first,
      client_last: selectedClientForProjects.client_last,
      project_id: project.id,
      project_name: project.project_name,
      project_hourly: project.hourly_rate || 50,
      project_color: project.color || '#CCCCCC'
    });
    setSearchTerm('');
    setShowProjectPicker(false);
    setSelectedClientForProjects(null);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClientSelect(null);
    setSearchTerm('');
  };

  const handleInputFocus = () => {
    loadClients(); // Refresh data when focused
    setIsOpen(true);
  };

  return (
    <div ref={dropdownRef} className='flex-center-center' style={{ width: '100%', position: 'relative' }}>
      <div className='flex-center-start' style={{ width: '100%', position: 'relative' }}>
        {selectedClient && (
          <div className='circle' style={{ backgroundColor: selectedClient.project_color }} />
        )}
        <input
          type="text"
          className='select-client-input'
          placeholder="Search clients..."
          value={selectedClient ? `${selectedClient.client_name} - ${selectedClient.project_name}` : searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={handleInputFocus}
          readOnly={!!selectedClient}
          style={{ paddingRight: selectedClient ? '30px' : undefined }}
        />
        {selectedClient && (
          <button onClick={handleClear} className='transparent-button' > ✕ </button>
        )}
      </div>

      {isOpen && filteredClients.length > 0 && (
        <div className="search-select-client-box">
          {filteredClients.map(client => {
            const projects = client.projects || [];
            return (
              <div
                key={client.id}
                onClick={() => handleClientClick(client)}
                className="search-select-client-entry"
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
              >
                <p className='no-text-spacing'><strong>{client.client_first} {client.client_last}</strong></p>
                  
                
                {projects.length > 0 ? (
                  <div className='flex-start-start flex-wrap'>
                    {projects.map((project: Project) => (
                      <div key={project.id} className='client-tag-wrapper' >
                        <div className='circle' style={{ backgroundColor: project.color || '#CCCCCC' }} />
                        <p className='no-text-spacing small-text'>{project.project_name}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className='no-text-spacing small-text'><i>No projects</i></p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showProjectPicker && selectedClientForProjects && (
        <div className="search-select-client-box">
          <p className='no-text-spacing'><strong> Select a project for {selectedClientForProjects.client_first} {selectedClientForProjects.client_last}: </strong> </p>
          {(selectedClientForProjects.projects || []).map(project => (
            <div
              key={project.id}
              onClick={() => handleProjectSelect(project)}
              className="search-select-client-entry"
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
            >
              <div className='client-tag-wrapper'>
                <div className='circle' style={{ backgroundColor: project.color || '#CCCCCC' }} />
                <p className='no-text-spacing small-text'>{project.project_name}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}