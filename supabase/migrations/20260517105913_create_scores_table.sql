-- Create the scores table for tracking user game scores
create table public.scores (
  user_id uuid not null references auth.users (id) on delete cascade,
  score integer not null default 0,
  best integer not null default 0,
  updated_at timestamptz not null default now(),

  constraint scores_pkey primary key (user_id)
);

-- Enable Row Level Security
alter table public.scores enable row level security;

-- Users can read their own score
create policy "Users can read own score"
  on public.scores for select
  using (auth.uid() = user_id);

-- Users can insert their own score
create policy "Users can insert own score"
  on public.scores for insert
  with check (auth.uid() = user_id);

-- Users can update their own score
create policy "Users can update own score"
  on public.scores for update
  using (auth.uid() = user_id);
