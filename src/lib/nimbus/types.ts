export type PlanId = "free" | "pro";
export type PlanStatus = "active" | "past_due" | "canceled";

export type Workspace = {
  id: string;
  owner_id: string;
  name: string;
  plan: PlanId;
  plan_interval: "month" | "year" | null;
  plan_status: PlanStatus;
  plan_renews_at: string | null;
  canceled_at: string | null;
  onboarding_done: boolean;
  logo_data: string | null;
  created_at: string;
};

export type Member = {
  id: string;
  workspace_id: string;
  user_id: string | null;
  email: string;
  role: "owner" | "admin" | "member";
  status: "pending" | "active";
  invited_at: string;
};

export type Project = {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  color: string;
  status: "active" | "archived";
  due_date: string | null;
  created_by: string;
  created_at: string;
  locked?: boolean;
  task_count?: number;
  done_count?: number;
};

export type Task = {
  id: string;
  workspace_id: string;
  project_id: string;
  parent_id: string | null;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "blocked" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  due_date: string | null;
  assignee_id: string | null;
  tags: string;
  position: number;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type Note = {
  id: string;
  workspace_id: string;
  folder: string;
  title: string;
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type Client = {
  id: string;
  workspace_id: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  status: "lead" | "active" | "paused" | "churned";
  notes: string;
  created_by: string;
  created_at: string;
  locked?: boolean;
};

export type Deal = {
  id: string;
  workspace_id: string;
  client_id: string;
  title: string;
  value_cents: number;
  stage: "lead" | "qualified" | "proposal" | "won" | "lost";
  created_by: string;
  created_at: string;
};

export type InvoiceItem = { description: string; qty: number; unit_cents: number };

export type Invoice = {
  id: string;
  workspace_id: string;
  client_id: string | null;
  number: string;
  status: "draft" | "sent" | "paid" | "overdue" | "void";
  currency: string;
  issue_date: string;
  due_date: string | null;
  paid_at: string | null;
  notes: string;
  items_json: string;
  created_by: string;
  created_at: string;
  locked?: boolean;
  total_cents?: number;
};

export type TimeEntry = {
  id: string;
  workspace_id: string;
  project_id: string | null;
  task_id: string | null;
  user_id: string;
  notes: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  running: boolean;
};

export type FileRow = {
  id: string;
  workspace_id: string;
  folder: string;
  name: string;
  mime: string;
  size_bytes: number;
  data_url: string;
  created_by: string;
  created_at: string;
};

export type Comment = {
  id: string;
  workspace_id: string;
  entity_type: string;
  entity_id: string;
  body: string;
  user_id: string;
  created_at: string;
};

export type AiMessage = {
  id: string;
  workspace_id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export type Usage = {
  members: number;
  activeProjects: number;
  clients: number;
  invoicesThisMonth: number;
  storageBytes: number;
  aiThisMonth: number;
};

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  image: string | null;
};
