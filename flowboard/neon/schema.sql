-- ============================================================================
-- Flowboard schema — Neon PostgreSQL
-- Supabase'dan Neon'a taşıma: auth.users kaldırıldı, public.users eklendi.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- users  (Supabase'daki auth.users yerine — uygulama katmanında auth)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  name       TEXT NOT NULL,
  initials   TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#5B5BF5',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- boards
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.boards (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title      TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#5B5BF5',
  owner_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  starred    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS boards_owner_idx ON public.boards(owner_id);

-- ----------------------------------------------------------------------------
-- board_role enum
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE board_role AS ENUM ('owner', 'editor', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- board_members
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.board_members (
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  user_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role     board_role NOT NULL DEFAULT 'editor',
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (board_id, user_id)
);
CREATE INDEX IF NOT EXISTS board_members_user_idx ON public.board_members(user_id);

-- Board oluşturulduğunda sahibini otomatik üye ekle
CREATE OR REPLACE FUNCTION public.on_board_insert_add_owner()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.board_members (board_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_board_owner_member ON public.boards;
CREATE TRIGGER trg_board_owner_member
  AFTER INSERT ON public.boards
  FOR EACH ROW EXECUTE FUNCTION public.on_board_insert_add_owner();

-- ----------------------------------------------------------------------------
-- columns
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.columns (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id   UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  wip_limit  INT  NOT NULL DEFAULT 0,
  position   TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS columns_board_idx ON public.columns(board_id, position);

-- ----------------------------------------------------------------------------
-- labels
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.labels (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id   UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS labels_board_idx ON public.labels(board_id);

-- ----------------------------------------------------------------------------
-- card_priority enum
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE card_priority AS ENUM ('low','med','high');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- cards
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cards (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id    UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  column_id   UUID NOT NULL REFERENCES public.columns(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  priority    card_priority,
  due_at      TIMESTAMPTZ,
  position    TEXT NOT NULL,
  created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cards_column_idx ON public.cards(column_id, position);
CREATE INDEX IF NOT EXISTS cards_board_idx  ON public.cards(board_id);

-- ----------------------------------------------------------------------------
-- card_labels (m2m)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.card_labels (
  card_id  UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES public.labels(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, label_id)
);

-- ----------------------------------------------------------------------------
-- card_assignees (m2m)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.card_assignees (
  card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, user_id)
);

-- ----------------------------------------------------------------------------
-- checklist_items
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.checklist_items (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id    UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  text       TEXT NOT NULL,
  done       BOOLEAN NOT NULL DEFAULT false,
  position   TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS checklist_card_idx ON public.checklist_items(card_id, position);

-- ----------------------------------------------------------------------------
-- comments
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comments (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id    UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS comments_card_idx ON public.comments(card_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- activity_type enum
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE activity_type AS ENUM (
    'card_created','card_moved','card_completed','card_commented','board_created'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- activities
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activities (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id   UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  card_id    UUID REFERENCES public.cards(id) ON DELETE CASCADE,
  actor_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       activity_type NOT NULL,
  payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS activities_board_idx ON public.activities(board_id, created_at DESC);

-- ============================================================================
-- Demo workspace seed fonksiyonu
-- ============================================================================
CREATE OR REPLACE FUNCTION public.seed_demo_workspace(p_user uuid)
RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE
  v_board_id    uuid;
  v_col_backlog uuid;
  v_col_todo    uuid;
  v_col_doing   uuid;
  v_col_review  uuid;
  v_col_done    uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.boards WHERE owner_id = p_user) THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.boards (title, color, owner_id, starred)
  VALUES ('Flowboard — Product', '#5B5BF5', p_user, true)
  RETURNING id INTO v_board_id;

  INSERT INTO public.columns (board_id, title, wip_limit, position) VALUES
    (v_board_id, 'Backlog',     0, 'a0'),
    (v_board_id, 'To do',       5, 'a1'),
    (v_board_id, 'In progress', 3, 'a2'),
    (v_board_id, 'Review',      2, 'a3'),
    (v_board_id, 'Done',        0, 'a4');

  SELECT id INTO v_col_backlog FROM public.columns WHERE board_id = v_board_id AND title = 'Backlog';
  SELECT id INTO v_col_todo    FROM public.columns WHERE board_id = v_board_id AND title = 'To do';
  SELECT id INTO v_col_doing   FROM public.columns WHERE board_id = v_board_id AND title = 'In progress';
  SELECT id INTO v_col_review  FROM public.columns WHERE board_id = v_board_id AND title = 'Review';
  SELECT id INTO v_col_done    FROM public.columns WHERE board_id = v_board_id AND title = 'Done';

  INSERT INTO public.labels (board_id, name, color) VALUES
    (v_board_id, 'bug',      '#E25C4B'),
    (v_board_id, 'feature',  '#3E7CE0'),
    (v_board_id, 'design',   '#8B5BD9'),
    (v_board_id, 'research', '#D49A2E'),
    (v_board_id, 'infra',    '#4A8C6F');

  INSERT INTO public.cards (board_id, column_id, title, description, priority, due_at, position, created_by)
  VALUES
    (v_board_id, v_col_todo,    'Password reset email bounces',
     'Support flagged three reports this week.', 'high', now() + INTERVAL '2 days', 'a0', p_user),
    (v_board_id, v_col_doing,   'Kanban drag-drop perf on 200+ cards',
     'Boards with >200 cards stutter during drag.', 'high', now() + INTERVAL '5 days', 'a0', p_user),
    (v_board_id, v_col_backlog, 'Audit onboarding drop-off funnel', '', 'low', NULL, 'a0', p_user),
    (v_board_id, v_col_review,  'Board background picker', '', 'low', NULL, 'a0', p_user),
    (v_board_id, v_col_done,    'Set up CI for preview deploys', '', NULL, NULL, 'a0', p_user);

  INSERT INTO public.boards (title, color, owner_id, starred)
  VALUES ('Personal', '#2E7D6A', p_user, false)
  RETURNING id INTO v_board_id;

  INSERT INTO public.columns (board_id, title, wip_limit, position) VALUES
    (v_board_id, 'Inbox',     0, 'a0'),
    (v_board_id, 'This week', 5, 'a1'),
    (v_board_id, 'Done',      0, 'a2');

  RETURN v_board_id;
END;
$$;
