-- Migration: personal board support
-- boards tablosuna type kolonu eklendi: 'project' (takim) | 'personal' (kisisel)

ALTER TABLE public.boards
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'project'
    CHECK (type IN ('project', 'personal'));

-- Mevcut board'lar zaten proje board'u, default ile otomatik ayarlanir.

-- seed_demo_workspace fonksiyonunu guncelle: 'Personal' board artik personal tipinde
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

  INSERT INTO public.boards (title, color, owner_id, starred, type)
  VALUES ('Flowboard — Product', '#5B5BF5', p_user, true, 'project')
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

  INSERT INTO public.boards (title, color, owner_id, starred, type)
  VALUES ('Personal', '#2E7D6A', p_user, false, 'personal')
  RETURNING id INTO v_board_id;

  INSERT INTO public.columns (board_id, title, wip_limit, position) VALUES
    (v_board_id, 'Inbox',     0, 'a0'),
    (v_board_id, 'This week', 5, 'a1'),
    (v_board_id, 'Done',      0, 'a2');

  RETURN v_board_id;
END;
$$;
