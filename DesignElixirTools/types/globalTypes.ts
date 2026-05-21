export interface TrackingSession {
  session_start: string;
  session_end: string;
  elapsed_time: number;
}

export interface TimeEntry {
  id: string;
  created_at: string;
  start_time: string;
  end_time: string | null;
  time_lapsed: number | null;
  client_id: string;
  description: string;
  tracking_finished: boolean;
  invoice_id: string | null;
  billable: boolean;
  project: {
    client_id: string;
    client_first: string;
    client_last: string;
    project_id: string;
    project_name: string;
    project_color: string;
    project_image?: string;
    hourly_rate?: number;
    deadline?: string;
    active?: boolean;
  };
}

export interface Checklist {
  id: string;
  created_at: string;
  project_id: string;
  task_description: string;
  task_order: number;
  task_deadline: string | null;
  task_status: string;
  task_completed: boolean;
  task_bucket: string;
}

export interface Client {
  id: string;
  client_first: string;
  client_last: string;
  client_email: string;
  client_phone?: string;
  created_at: string;
  
  client_projects: { project_name: string; project_color: string, project_id: string }[];
  client_notes?: string;
  client_billable_rate?: number;
  client_drive?: string;
  client_github?: string;
  last_active?: string;
  active?: boolean;
}

export interface Project {
  id: string;
  created_at: string;
  project_name: string;
  client_id: string;
  client_first: string;
  client_last: string;
  hourly_rate?: number;
  color?: string;
  active?: boolean;
  deadline?: string;
  last_active?: string;
  client_image?: string; 
}

export interface SelectedClientData {
  client_id: string;
  client_name: string;
  client_first: string;
  client_last: string;
  project_id: string;
  project_name: string;
  project_color: string;
}

export interface ClientProject {
  project_id: string;
  project_name: string;
  project_color: string;
}

export interface Task {
  task_id: string;
  task_name: string;
  client_id?: string | null;
  project_id?: string | null;
  created_at: string;
  task_notes?: string | null;
  task_deadline?: string | null;
  task_priority?: number | null;
  task_bucket?: string | null;
  task_status: string;
  task_active: boolean;
}

export interface LineItem {
  line_item_description: string;
  hourly: boolean;
  rate: number;
  multiplier: number;
  total: number;
}

export interface Invoice {
  id: string;
  created_at: string;
  start_date: string;
  end_date: string;
  invoice_date: string;
  invoice_due: string;
  client_id: number;
  client_first: string;
  client_last: string;
  client_email: string;
  client_phone?: string;
  project_id?: number;
  project_name?: string;
  project_hourly?: number;
  time_entries: number[];
  time_entries_sum: number;
  line_items: LineItem[];
  line_items_total: number;
  project_costs?: number;
  adjustments?: number;
  adjustments_descriptor?: string;
  notes?: string;
  paid: boolean;
  payment_method?: string;
  fees?: number;
  date_payment_received?: string;
  private_notes?: string;
  draft: true;
}