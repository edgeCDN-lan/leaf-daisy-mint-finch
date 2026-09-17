-- Nimbus Workspace application schema.
-- Per-user / per-workspace rows: always scoped server-side by membership.

create table if not exists workspaces (
  id text primary key,
  owner_id text not null,
  name text not null,
  plan text not null default 'free',
  plan_interval text,
  plan_status text not null default 'active',
  plan_renews_at timestamptz,
  canceled_at timestamptz,
  onboarding_done boolean not null default false,
  logo_data text,
  created_at timestamptz not null default now()
);
create index if not exists workspaces_owner_id_idx on workspaces (owner_id);

create table if not exists workspace_members (
  id text primary key,
  workspace_id text not null,
  user_id text,
  email text not null,
  role text not null default 'member',
  status text not null default 'active',
  invited_at timestamptz not null default now()
);
create unique index if not exists workspace_members_ws_email_idx
  on workspace_members (workspace_id, email);
create index if not exists workspace_members_user_id_idx on workspace_members (user_id);

create table if not exists projects (
  id text primary key,
  workspace_id text not null,
  name text not null,
  description text not null default '',
  color text not null default 'lagoon',
  status text not null default 'active',
  due_date date,
  created_by text not null,
  created_at timestamptz not null default now()
);
create index if not exists projects_workspace_id_idx on projects (workspace_id);

create table if not exists tasks (
  id text primary key,
  workspace_id text not null,
  project_id text not null,
  parent_id text,
  title text not null,
  description text not null default '',
  status text not null default 'todo',
  priority text not null default 'medium',
  due_date date,
  assignee_id text,
  tags text not null default '',
  position integer not null default 0,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tasks_workspace_id_idx on tasks (workspace_id);
create index if not exists tasks_project_id_idx on tasks (project_id);

create table if not exists notes (
  id text primary key,
  workspace_id text not null,
  folder text not null default 'Inbox',
  title text not null default 'Untitled',
  content text not null default '',
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists notes_workspace_id_idx on notes (workspace_id);

create table if not exists clients (
  id text primary key,
  workspace_id text not null,
  name text not null,
  email text not null default '',
  company text not null default '',
  phone text not null default '',
  status text not null default 'lead',
  notes text not null default '',
  created_by text not null,
  created_at timestamptz not null default now()
);
create index if not exists clients_workspace_id_idx on clients (workspace_id);

create table if not exists deals (
  id text primary key,
  workspace_id text not null,
  client_id text not null,
  title text not null,
  value_cents integer not null default 0,
  stage text not null default 'lead',
  created_by text not null,
  created_at timestamptz not null default now()
);
create index if not exists deals_workspace_id_idx on deals (workspace_id);

create table if not exists invoices (
  id text primary key,
  workspace_id text not null,
  client_id text,
  number text not null,
  status text not null default 'draft',
  currency text not null default 'USD',
  issue_date date not null,
  due_date date,
  paid_at timestamptz,
  notes text not null default '',
  items_json text not null default '[]',
  created_by text not null,
  created_at timestamptz not null default now()
);
create index if not exists invoices_workspace_id_idx on invoices (workspace_id);

create table if not exists time_entries (
  id text primary key,
  workspace_id text not null,
  project_id text,
  task_id text,
  user_id text not null,
  notes text not null default '',
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_seconds integer not null default 0,
  running boolean not null default false
);
create index if not exists time_entries_workspace_id_idx on time_entries (workspace_id);
create index if not exists time_entries_user_id_idx on time_entries (user_id);

create table if not exists files (
  id text primary key,
  workspace_id text not null,
  folder text not null default 'All files',
  name text not null,
  mime text not null default 'application/octet-stream',
  size_bytes integer not null default 0,
  data_url text not null default '',
  created_by text not null,
  created_at timestamptz not null default now()
);
create index if not exists files_workspace_id_idx on files (workspace_id);

create table if not exists comments (
  id text primary key,
  workspace_id text not null,
  entity_type text not null,
  entity_id text not null,
  body text not null,
  user_id text not null,
  created_at timestamptz not null default now()
);
create index if not exists comments_entity_idx on comments (entity_type, entity_id);

create table if not exists ai_usage (
  workspace_id text not null,
  period text not null,
  count integer not null default 0,
  primary key (workspace_id, period)
);

create table if not exists ai_messages (
  id text primary key,
  workspace_id text not null,
  user_id text not null,
  role text not null,
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists ai_messages_workspace_id_idx on ai_messages (workspace_id);

create table if not exists billing_events (
  id text primary key,
  workspace_id text not null,
  type text not null,
  payload text not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists billing_events_workspace_id_idx on billing_events (workspace_id);
