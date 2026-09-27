-- Users table
create table public.users (
    id uuid primary key default gen_random_uuid(),
    google_id text unique,
    name text not null,
    email text unique not null,
    avatar_url text,
    created_at timestamptz not null default now()
);

-- Tasks table
create table public.tasks (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    description text,
    created_by uuid not null references public.users(id) on delete cascade,
    assigned_to uuid references public.users(id) on delete set null,
    status text not null default 'pending',
    created_at timestamptz not null default now(),
    completed_at timestamptz
);

-- Allow only valid task statuses
alter table public.tasks
add constraint tasks_status_check
check (status in ('pending', 'completed'));