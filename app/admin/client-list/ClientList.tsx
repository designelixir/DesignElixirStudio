'use client';

import { Client, Project } from "@/app/admin/types/globalTypes";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { fetchClientTimesAction } from "../actions/clientActions";
import { fetchProjects } from '@/app/utils/clientUtils';
import EditClient from "./EditClient";
import CopyPaste from "../components/CopyPaste";
import Image from 'next/image';

interface ClientListProps {
  clients: Client[];
  refreshClients: () => void;
}

type SortOrder = 'asc' | 'desc';

export default function ClientList({ clients, refreshClients }: ClientListProps) {
  const router = useRouter();
  const [projectsMap, setProjectsMap] = useState<Record<string, Project[]>>({});
  const [timeMap, setTimeMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [showOnlyActiveProjects, setShowOnlyActiveProjects] = useState(true);
  const [sortedClients, setSortedClients] = useState<Client[]>([]);

  useEffect(() => {
    loadProjects();
    loadClientTimes();
  }, [clients]);

  useEffect(() => {
    sortClients();
  }, [clients, sortOrder, projectsMap]);

  const loadProjects = async () => {
    if (clients.length === 0) {
      setLoading(false);
      return;
    }

    try {
      const allProjects = await fetchProjects();

      const projectsByClient: Record<string, Project[]> = {};

      clients.forEach(client => {
        const clientProjectIds = typeof client.client_projects === 'string'
          ? JSON.parse(client.client_projects)
          : client.client_projects || [];

        projectsByClient[client.id] = allProjects.filter(p =>
          clientProjectIds.includes(p.id)
        );
      });

      setProjectsMap(projectsByClient);
    } catch (err) {
      console.error('Error loading projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadClientTimes = async () => {
    if (clients.length === 0) return;

    try {
      const clientIds = clients.map(c => c.id);
      const data = await fetchClientTimesAction(clientIds);

      const timesByClient: Record<string, number> = {};

      data?.forEach(entry => {
        if (!timesByClient[entry.client_id]) {
          timesByClient[entry.client_id] = 0;
        }
        timesByClient[entry.client_id] += entry.time_lapsed || 0;
      });

      setTimeMap(timesByClient);
    } catch (err) {
      console.error('Error loading client times:', err);
    }
  };

  const formatTime = (seconds: number): string => {
    if (!seconds) return '00:00:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const sortClients = () => {
    const sorted = [...clients].sort((a, b) => {
      const clientAProjects = projectsMap[a.id] || [];
      const clientBProjects = projectsMap[b.id] || [];
      const aHasActiveProjects = clientAProjects.some(p => p.active !== false);
      const bHasActiveProjects = clientBProjects.some(p => p.active !== false);

      if (aHasActiveProjects !== bHasActiveProjects) {
        return aHasActiveProjects ? -1 : 1;
      }

      if (a.active !== b.active) {
        return a.active === false ? 1 : -1;
      }

      if (a.last_active && b.last_active) {
        const dateA = new Date(a.last_active).getTime();
        const dateB = new Date(b.last_active).getTime();
        if (dateA !== dateB) {
          return dateB - dateA;
        }
      } else if (a.last_active && !b.last_active) {
        return -1;
      } else if (!a.last_active && b.last_active) {
        return 1;
      }

      const nameA = `${a.client_first} ${a.client_last}`.toLowerCase();
      const nameB = `${b.client_first} ${b.client_last}`.toLowerCase();

      if (sortOrder === 'asc') {
        return nameA.localeCompare(nameB);
      } else {
        return nameB.localeCompare(nameA);
      }
    });

    setSortedClients(sorted);
  };

  const toggleSort = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const handleNameClick = (clientId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/admin/client-list/${clientId}`);
  };

  const shouldShowClient = (client: Client): boolean => {
    if (!showOnlyActiveProjects) return true;
    const clientProjects = projectsMap[client.id] || [];
    const activeProjects = clientProjects.filter(p => p.active !== false);
    return activeProjects.length > 0;
  };

  if (clients.length === 0) {
    return <p>No clients yet. Add your first client!</p>;
  }

  if (loading) {
    return <div>Loading projects...</div>;
  }

  const visibleClients = sortedClients.filter(shouldShowClient);

  return (
    <div className="flex-start-start flex-column full-width">
      <div className="flex-center-start" style={{ marginBottom: '15px', gap: '10px' }}>
        <label className="switch">
          <input
            type="checkbox"
            checked={showOnlyActiveProjects}
            onChange={(e) => setShowOnlyActiveProjects(e.target.checked)}
          />
          <span className="slider"></span>
        </label>
        <span style={{ fontWeight: 'bold' }}>
          Show only clients with active projects
        </span>
      </div>

      <table className="full-width">
        <thead>
          <tr>
            <th>
              <div className="flex-center-start" style={{ gap: '8px' }}>
                <span>Name</span>
                <button
                  onClick={toggleSort}
                  className="icon-button"
                  title={sortOrder === 'asc' ? 'Sort Z-A' : 'Sort A-Z'}
                  style={{ padding: '2px' }}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </th>
            <th>Projects</th>
            <th>Email</th>
            <th>Total Time</th>
            <th>Drive</th>
            <th>GitHub</th>
            <th>Edit</th>
          </tr>
        </thead>
        <tbody>
          {visibleClients.map((client) => {
            const clientProjects = projectsMap[client.id] || [];
            const totalTime = timeMap[client.id] || 0;
            return (
              <tr key={client.id}>
                <td>
                  <h3 className="hover" onClick={(e) => handleNameClick(client.id, e)}>
                    {client.client_first} {client.client_last}
                  </h3>
                </td>
                <td>
                  {clientProjects.length > 0 ? (
                    <div className="flex-start-start flex-column" style={{ gap: '5px' }}>
                      {clientProjects.map((project) => (
                        <div
                          className="client-tag-wrapper"
                          key={project.id}
                          style={{ opacity: project.active === false ? 0.5 : 1 }}
                        >
                          <div className="circle" style={{ backgroundColor: project.color }} />
                          <p className="no-text-spacing">{project.project_name}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span>N/A</span>
                  )}
                </td>
                <td>
                  <div className="flex-center-start" style={{ gap: '5px' }}>
                    <span>{client.client_email}</span>
                    <CopyPaste value={client.client_email} />
                  </div>
                </td>
                <td>
                  <strong>{formatTime(totalTime)}</strong>
                </td>
                <td>
                  {client.client_drive ? (
                    <div className="flex-center-start" style={{ gap: '5px' }}>
                      <a href={client.client_drive} target="_blank" rel="noopener noreferrer">
                        Drive
                      </a>
                      <CopyPaste value={client.client_drive} />
                    </div>
                  ) : (
                    <span>N/A</span>
                  )}
                </td>
                <td>
                  {client.client_github ? (
                    <div className="flex-center-start" style={{ gap: '5px' }}>
                      <a href={client.client_github} target="_blank" rel="noopener noreferrer">
                        GitHub
                      </a>
                      <CopyPaste value={client.client_github} />
                    </div>
                  ) : (
                    <span>N/A</span>
                  )}
                </td>
                <td>
                  <EditClient clientId={client.id} onClientUpdated={refreshClients} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}