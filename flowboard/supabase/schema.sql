-- ============================================================================
-- Flowboard schema
-- Run this once on a fresh Supabase project (SQL Editor → New query → paste).
-- ============================================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ----------------------------------------------------------------------------
-- profiles  (mirrors auth.users, holds display data)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  name        text not null,
  initials    text not null,
  color       text not null default '#5B5BF5',
  created_at  timestamptz not null default now()
);

-- Auto-create profile row on signup. Pulls name/initials from raw_user_meta_data.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_name     text := coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));
  v_initials text := upper(substring(regexp_replace(v_name, '[^a-zA-Z\s]', '', 'g') from 1 for 2));
  v_colors   text[] := array['#5B5BF5','#2E7D6A','#C84B7A','#E6884E','#8B5BD9','#3E7CE0'];
begin
  insert into public.profiles (id, email, name, initials, color)
  values (
    new.id,
    new.email,
    v_name,
    coalesce(nullif(v_initials,''), 'U'),
    v_colors[1 + floor(random() * array_length(v_colors,1))::int]
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- boards
-- ----------------------------------------------------------------------------
create table if not exists public.boards (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null,
  color       text not null default '#5B5BF5',
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  starred     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists boards_owner_idx on public.boards(owner_id);

-- ----------------------------------------------------------------------------
-- board_members  (sharing / RBAC)
-- ----------------------------------------------------------------------------
create type board_role as enum ('owner', 'editor', 'viewer');

create table if not exists public.board_members (
  board_id    uuid not null references public.boards(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  role        board_role not null default 'editor',
  added_at    timestamptz not null default now(),
  primary key (board_id, user_id)
);
create index if not exists board_members_user_idx on public.board_members(user_id);

-- Auto-add owner as member on board creation
create or replace function public.on_board_insert_add_owner()
returns trigger language plpgsql security definer as $$
begin
  insert into public.board_members (board_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict do nothing;
  return new;
end;
$$;
drop trigger if exists trg_board_owner_member on public.boards;
create trigger trg_board_owner_member
  after insert on public.boards
  for each row execute function public.on_board_insert_add_owner();

-- Helper: does the current user have access to this board?
create or replace function public.has_board_access(p_board_id uuid)
returns boolean
language sql security definer stable
as $$
  select exists (
    select 1 from public.board_members
    where board_id = p_board_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_board_editor(p_board_id uuid)
returns boolean
language sql security definer stable
as $$
  select exists (
    select 1 from public.board_members
    where board_id = p_board_id
      and user_id = auth.uid()
      and role in ('owner','editor')
  );
$$;

-- ----------------------------------------------------------------------------
-- columns  (kanban columns)
-- ----------------------------------------------------------------------------
create table if not exists public.columns (
  id          uuid primary key default uuid_generate_v4(),
  board_id    uuid not null references public.boards(id) on delete cascade,
  title       text not null,
  wip_limit   int  not null default 0,
  -- fractional index (LexoRank-style). Stored as text so we can insert between
  -- any two existing positions without renumbering siblings.
  position    text not null,
  created_at  timestamptz not null default now()
);
create index if not exists columns_board_idx on public.columns(board_id, position);

-- ----------------------------------------------------------------------------
-- labels  (board-scoped)
-- ----------------------------------------------------------------------------
create table if not exists public.labels (
  id          uuid primary key default uuid_generate_v4(),
  board_id    uuid not null references public.boards(id) on delete cascade,
  name        text not null,
  color       text not null,
  created_at  timestamptz not null default now()
);
create index if not exists labels_board_idx on public.labels(board_id);

-- ----------------------------------------------------------------------------
-- cards
-- ----------------------------------------------------------------------------
create type card_priority as enum ('low','med','high');

create table if not exists public.cards (
  id           uuid primary key default uuid_generate_v4(),
  board_id     uuid not null references public.boards(id) on delete cascade,
  column_id    uuid not null references public.columns(id) on delete cascade,
  title        text not null,
  description  text not null default '',
  priority     card_priority,
  due_at       timestamptz,
  position     text not null,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists cards_column_idx on public.cards(column_id, position);
create index if not exists cards_board_idx  on public.cards(board_id);

-- ----------------------------------------------------------------------------
-- card_labels (m2m)
-- ----------------------------------------------------------------------------
create table if not exists public.card_labels (
  card_id   uuid not null references public.cards(id) on delete cascade,
  label_id  uuid not null references public.labels(id) on delete cascade,
  primary key (card_id, label_id)
);
create index if not exists card_labels_card_idx on public.card_labels(card_id);

-- ----------------------------------------------------------------------------
-- card_assignees (m2m)
-- ----------------------------------------------------------------------------
create table if not exists public.card_assignees (
  card_id  uuid not null references public.cards(id) on delete cascade,
  user_id  uuid not null references public.profiles(id) on delete cascade,
  primary key (card_id, user_id)
);
create index if not exists card_assignees_card_idx on public.card_assignees(card_id);

-- ----------------------------------------------------------------------------
-- checklist_items
-- ----------------------------------------------------------------------------
create table if not exists public.checklist_items (
  id          uuid primary key default uuid_generate_v4(),
  card_id     uuid not null references public.cards(id) on delete cascade,
  text        text not null,
  done        boolean not null default false,
  position    text not null,
  created_at  timestamptz not null default now()
);
create index if not exists checklist_card_idx on public.checklist_items(card_id, position);

-- ----------------------------------------------------------------------------
-- comments
-- ----------------------------------------------------------------------------
create table if not exists public.comments (
  id          uuid primary key default uuid_generate_v4(),
  card_id     uuid not null references public.cards(id) on delete cascade,
  author_id   uuid not null references public.profiles(id) on delete cascade,
  text        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists comments_card_idx on public.comments(card_id, created_at desc);

-- ----------------------------------------------------------------------------
-- activities  (movement / creation log for the dashboard feed)
-- ----------------------------------------------------------------------------
create type activity_type as enum ('card_created','card_moved','card_completed','card_commented','board_created');

create table if not exists public.activities (
  id          uuid primary key default uuid_generate_v4(),
  board_id    uuid not null references public.boards(id) on delete cascade,
  card_id     uuid references public.cards(id) on delete cascade,
  actor_id    uuid not null references public.profiles(id) on delete cascade,
  type        activity_type not null,
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists activities_board_idx on public.activities(board_id, created_at desc);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles        enable row level security;
alter table public.boards          enable row level security;
alter table public.board_members   enable row level security;
alter table public.columns         enable row level security;
alter table public.labels          enable row level security;
alter table public.cards           enable row level security;
alter table public.card_labels     enable row level security;
alter table public.card_assignees  enable row level security;
alter table public.checklist_items enable row level security;
alter table public.comments        enable row level security;
alter table public.activities      enable row level security;

-- profiles: every authenticated user can read profiles (so we can show names
-- on shared boards), but only update their own.
create policy "profiles_select_all" on public.profiles
  for select using (auth.role() = 'authenticated');
create policy "profiles_update_self" on public.profiles
  for update using (auth.uid() = id);
create policy "profiles_insert_self" on public.profiles
  for insert with check (auth.uid() = id);

-- boards: members can read, owner can update/delete, any auth user can insert
create policy "boards_select_member" on public.boards
  for select using (public.has_board_access(id));
create policy "boards_insert_self" on public.boards
  for insert with check (owner_id = auth.uid());
create policy "boards_update_owner" on public.boards
  for update using (owner_id = auth.uid());
create policy "boards_delete_owner" on public.boards
  for delete using (owner_id = auth.uid());

-- board_members: members can see the membership list; owner can manage
create policy "members_select" on public.board_members
  for select using (public.has_board_access(board_id));
create policy "members_insert_owner" on public.board_members
  for insert with check (
    exists (select 1 from public.boards b where b.id = board_id and b.owner_id = auth.uid())
    or user_id = auth.uid()  -- allow trigger to add owner
  );
create policy "members_delete_owner" on public.board_members
  for delete using (
    exists (select 1 from public.boards b where b.id = board_id and b.owner_id = auth.uid())
  );

-- Generic helper: editor-or-better can write child rows; member can read
create policy "columns_select" on public.columns
  for select using (public.has_board_access(board_id));
create policy "columns_write" on public.columns
  for all using (public.is_board_editor(board_id))
  with check (public.is_board_editor(board_id));

create policy "labels_select" on public.labels
  for select using (public.has_board_access(board_id));
create policy "labels_write" on public.labels
  for all using (public.is_board_editor(board_id))
  with check (public.is_board_editor(board_id));

create policy "cards_select" on public.cards
  for select using (public.has_board_access(board_id));
create policy "cards_write" on public.cards
  for all using (public.is_board_editor(board_id))
  with check (public.is_board_editor(board_id));

create policy "card_labels_select" on public.card_labels
  for select using (
    exists (select 1 from public.cards c where c.id = card_id and public.has_board_access(c.board_id))
  );
create policy "card_labels_write" on public.card_labels
  for all using (
    exists (select 1 from public.cards c where c.id = card_id and public.is_board_editor(c.board_id))
  ) with check (
    exists (select 1 from public.cards c where c.id = card_id and public.is_board_editor(c.board_id))
  );

create policy "card_assignees_select" on public.card_assignees
  for select using (
    exists (select 1 from public.cards c where c.id = card_id and public.has_board_access(c.board_id))
  );
create policy "card_assignees_write" on public.card_assignees
  for all using (
    exists (select 1 from public.cards c where c.id = card_id and public.is_board_editor(c.board_id))
  ) with check (
    exists (select 1 from public.cards c where c.id = card_id and public.is_board_editor(c.board_id))
  );

create policy "checklist_select" on public.checklist_items
  for select using (
    exists (select 1 from public.cards c where c.id = card_id and public.has_board_access(c.board_id))
  );
create policy "checklist_write" on public.checklist_items
  for all using (
    exists (select 1 from public.cards c where c.id = card_id and public.is_board_editor(c.board_id))
  ) with check (
    exists (select 1 from public.cards c where c.id = card_id and public.is_board_editor(c.board_id))
  );

create policy "comments_select" on public.comments
  for select using (
    exists (select 1 from public.cards c where c.id = card_id and public.has_board_access(c.board_id))
  );
create policy "comments_insert" on public.comments
  for insert with check (
    author_id = auth.uid() and
    exists (select 1 from public.cards c where c.id = card_id and public.has_board_access(c.board_id))
  );
create policy "comments_delete_author" on public.comments
  for delete using (author_id = auth.uid());

create policy "activities_select" on public.activities
  for select using (public.has_board_access(board_id));
create policy "activities_insert" on public.activities
  for insert with check (
    actor_id = auth.uid() and public.has_board_access(board_id)
  );

-- ----------------------------------------------------------------------------
-- sprints
-- ----------------------------------------------------------------------------
create type sprint_status as enum ('active', 'completed');

create table if not exists public.sprints (
  id            uuid primary key default uuid_generate_v4(),
  board_id      uuid not null references public.boards(id) on delete cascade,
  title         text not null,
  sprint_number int  not null default 1,
  goal          text not null default '',
  status        sprint_status not null default 'active',
  started_at    timestamptz not null default now(),
  ended_at      timestamptz
);
create index if not exists sprints_board_idx on public.sprints(board_id, started_at desc);

-- ----------------------------------------------------------------------------
-- sprint_archived_cards  (denormalized snapshot of cards when sprint completes)
-- ----------------------------------------------------------------------------
create table if not exists public.sprint_archived_cards (
  id                uuid primary key default uuid_generate_v4(),
  sprint_id         uuid not null references public.sprints(id) on delete cascade,
  board_id          uuid not null references public.boards(id) on delete cascade,
  card_title        text not null,
  card_description  text not null default '',
  card_priority     text,
  card_due_at       timestamptz,
  column_title      text not null default 'Done',
  created_by_name   text,
  assignee_names    text[] not null default '{}',
  watcher_names     text[] not null default '{}',
  label_names       text[] not null default '{}',
  label_colors      text[] not null default '{}',
  checklist_total   int not null default 0,
  checklist_done    int not null default 0,
  comment_count     int not null default 0,
  completed_at      timestamptz not null default now()
);
create index if not exists sprint_archived_board_idx on public.sprint_archived_cards(board_id);
create index if not exists sprint_archived_sprint_idx on public.sprint_archived_cards(sprint_id);

-- RLS for sprints
alter table public.sprints enable row level security;
create policy "sprints_select" on public.sprints
  for select using (public.has_board_access(board_id));
create policy "sprints_write" on public.sprints
  for all using (public.is_board_editor(board_id))
  with check (public.is_board_editor(board_id));

-- RLS for sprint_archived_cards
alter table public.sprint_archived_cards enable row level security;
create policy "sprint_archived_select" on public.sprint_archived_cards
  for select using (public.has_board_access(board_id));
create policy "sprint_archived_write" on public.sprint_archived_cards
  for all using (public.is_board_editor(board_id))
  with check (public.is_board_editor(board_id));

-- ============================================================================
-- Grants  (PostgREST needs explicit table-level privileges in addition to RLS)
-- ============================================================================
grant usage on schema public to anon, authenticated;
grant all on all tables    in schema public to authenticated;
grant all on all sequences in schema public to authenticated;
grant select on all tables in schema public to anon;
