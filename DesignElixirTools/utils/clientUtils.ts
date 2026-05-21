import { createClient } from '@/utils/supabase/client';
import { Client, Project } from '@/types/globalTypes';

// Cache storage
let clientsCache: Client[] | null = null;
let projectsCache: Project[] | null = null;
let clientsCacheTime: number = 0;
let projectsCacheTime: number = 0;

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Check if cache is still valid
const isCacheValid = (cacheTime: number): boolean => {
  return Date.now() - cacheTime < CACHE_DURATION;
};

/**
 * Fetch all clients with optional cache
 * @param forceRefresh - Skip cache and fetch fresh data
 * @returns Array of clients
 */
export const fetchClients = async (forceRefresh: boolean = false): Promise<Client[]> => {
  if (!forceRefresh && clientsCache && isCacheValid(clientsCacheTime)) {
    return clientsCache;
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('client_first', { ascending: true });

    if (error) throw error;

    clientsCache = data || [];
    clientsCacheTime = Date.now();
    return clientsCache;
  } catch (err) {
    console.error('Error fetching clients:', err);
    return [];
  }
};

/**
 * Fetch all projects with optional cache
 * @param forceRefresh - Skip cache and fetch fresh data
 * @returns Array of projects
 */
export const fetchProjects = async (forceRefresh: boolean = false): Promise<Project[]> => {
  if (!forceRefresh && projectsCache && isCacheValid(projectsCacheTime)) {
    return projectsCache;
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('active', { ascending: false })
      .order('project_name', { ascending: true });

    if (error) throw error;

    projectsCache = data || [];
    projectsCacheTime = Date.now();
    return projectsCache;
  } catch (err) {
    console.error('Error fetching projects:', err);
    return [];
  }
};

/**
 * Fetch a single client by ID
 * @param clientId - Client UUID
 * @returns Client object or null
 */
export const fetchClientById = async (clientId: string): Promise<Client | null> => {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error fetching client:', err);
    return null;
  }
};

/**
 * Fetch a single project by ID
 * @param projectId - Project UUID
 * @returns Project object or null
 */
export const fetchProjectById = async (projectId: string): Promise<Project | null> => {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error fetching project:', err);
    return null;
  }
};

/**
 * Fetch projects for a specific client
 * @param clientId - Client UUID
 * @returns Array of projects
 */
export const fetchProjectsByClient = async (clientId: string): Promise<Project[]> => {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('client_id', clientId)
      .order('active', { ascending: false })
      .order('project_name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching projects by client:', err);
    return [];
  }
};

/**
 * Fetch client with their projects
 * @param clientId - Client UUID
 * @returns Client with projects array
 */
export const fetchClientWithProjects = async (clientId: string): Promise<{ client: Client | null; projects: Project[] }> => {
  const [client, projects] = await Promise.all([
    fetchClientById(clientId),
    fetchProjectsByClient(clientId)
  ]);

  return { client, projects };
};

/**
 * Clear all caches
 */
export const clearCache = (): void => {
  clientsCache = null;
  projectsCache = null;
  clientsCacheTime = 0;
  projectsCacheTime = 0;
};

/**
 * Clear specific cache
 * @param type - 'clients' or 'projects'
 */
export const clearSpecificCache = (type: 'clients' | 'projects'): void => {
  if (type === 'clients') {
    clientsCache = null;
    clientsCacheTime = 0;
  } else if (type === 'projects') {
    projectsCache = null;
    projectsCacheTime = 0;
  }
};

/**
 * Get active clients only
 * @param forceRefresh - Skip cache and fetch fresh data
 * @returns Array of active clients
 */
export const fetchActiveClients = async (forceRefresh: boolean = false): Promise<Client[]> => {
  const clients = await fetchClients(forceRefresh);
  return clients.filter(client => client.active !== false);
};

/**
 * Get active projects only
 * @param forceRefresh - Skip cache and fetch fresh data
 * @returns Array of active projects
 */
export const fetchActiveProjects = async (forceRefresh: boolean = false): Promise<Project[]> => {
  const projects = await fetchProjects(forceRefresh);
  return projects.filter(project => project.active !== false);
};