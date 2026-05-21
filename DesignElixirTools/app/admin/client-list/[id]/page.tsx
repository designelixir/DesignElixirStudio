'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { fetchClientWithProjects, clearSpecificCache } from '@/app/utils/clientUtils';
import { Client, Project } from '@/app/admin/types/globalTypes';
import EditClient from '../EditClient';
import TimeTrackedList from '@/app/admin/time-tracking/TimeTrackedList';
import Link from 'next/link';
import Image from 'next/image';
import EditProject from '@/app/admin/projects/EditProject';

export default function ClientDetailPage() {
  const params = useParams();
  const [client, setClient] = useState<Client | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClient();
  }, [params.id]);

  const loadClient = async () => {
    try {
      const { client, projects } = await fetchClientWithProjects(params.id as string);
      setClient(client);
      setProjects(projects);
    } catch (err) {
      console.error('Error loading client:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClientUpdated = async () => {
    clearSpecificCache('clients');
    await loadClient();
  };

  const handleProjectUpdated = async () => {
    clearSpecificCache('projects');
    await loadClient();
  };

  if (loading) return <div>Loading...</div>;
  if (!client) return <div>Client not found</div>;

  return (
    <div className='full-width basic-padding'>
      <h3 className='no-text-spacing'>
        <Link href="/client-list" className="no-link-styling">CLIENT LIST</Link>
      </h3>
      <div className="flex-center-spacebetween flex-wrap full-width">
        <div className='flex-start-start flex-column full-width' style={{minWidth: '400px'}}>
          <h1>{client.client_first} {client.client_last}</h1>
          {client.client_email ? (
            <Link className='flex-center-start no-link-styling contact-link' href={`mailto:${client.client_email}`}>
              <Image src="/mail.png" alt="email icon" width={20} height={20} style={{marginRight: '10px'}} />
              {client.client_email}
            </Link>
          ) : null}
          {client.client_phone ? (
            <Link className='flex-center-start no-link-styling contact-link' href={`tel:${client.client_phone}`}>
              <Image src="/phone.svg" alt="phone icon" width={20} height={20} style={{marginRight: '10px'}} />
              {client.client_phone}
            </Link>
          ) : null}
        </div>
        <div className='flex-end-end full-width'>
          {client.client_drive ? (
            <Link className='flex-center-start no-flex-grow contact-link' href={client.client_drive} target="_blank" rel="noopener noreferrer">
              <Image src="/google-drive.png" alt="drive icon" width={20} height={20} style={{marginRight: '10px'}} />
            </Link>
          ) : null}
          {client.client_github ? (
            <Link className='flex-center-start no-flex-grow contact-link' href={client.client_github} target="_blank" rel="noopener noreferrer">
              <Image src="/github.png" alt="github icon" width={20} height={20} style={{marginRight: '10px'}} />
            </Link>
          ) : null}
          <EditClient clientId={client.id} onClientUpdated={handleClientUpdated} />
        </div>
      </div>
      <hr />
      
      <h2>Projects</h2>
      {projects.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {projects.map((project) => (
            <div key={project.id} className="project-section full-width basic-padding">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                {project.client_image && (
                  <Image 
                    src={project.client_image} 
                    alt={project.project_name}
                    width={40}
                    height={40}
                    style={{ borderRadius: '50%', objectFit: 'cover' }}
                  />
                )}
                <div
                  style={{
                    width: '15px',
                    height: '15px',
                    borderRadius: '50%',
                    backgroundColor: project.color
                  }}
                />
                <div className='flex-center-spacebetween full-width'>
                  <h4 className='no-text-spacing'>{project.project_name}</h4>
                  <EditProject projectId={project.id} onProjectUpdated={handleProjectUpdated} />
                </div>
                {project.deadline && (
                  <span style={{ fontSize: '12px', color: '#666', marginLeft: '10px' }}>
                    Deadline: {new Date(project.deadline).toLocaleDateString()}
                  </span>
                )}
                {!project.active && (
                  <span style={{ 
                    fontSize: '12px', 
                    color: '#ff9800',
                    padding: '2px 8px',
                    backgroundColor: '#fff3e0',
                    borderRadius: '12px',
                    marginLeft: '10px'
                  }}>
                    Inactive
                  </span>
                )}
              </div>
              <TimeTrackedList 
                filterProjectIds={[project.id]}
                billableRate={project.hourly_rate || client.client_billable_rate}
                showCalculations={true}
                allowProjectSelection={false}
              />
            </div>
          ))}
        </div>
      ) : (
        <span>No projects yet. Add a project in the client edit modal.</span>
      )}
    </div>
  );
}