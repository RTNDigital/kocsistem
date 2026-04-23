-- Optional: seed sample data for the currently logged-in user.
-- Run from SQL Editor *after* you've signed up at least once,
-- replacing :uid with your auth.uid() (or use SELECT auth.uid() in psql).

-- Easier path: open the app, sign up, then run the helper RPC below
-- (which the app calls automatically on first login).

create or replace function public.seed_demo_workspace(p_user uuid)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_board_id uuid;
  v_col_backlog uuid;
  v_col_todo    uuid;
  v_col_doing   uuid;
  v_col_review  uuid;
  v_col_done    uuid;
  v_l_bug       uuid;
  v_l_feat      uuid;
  v_l_design    uuid;
  v_l_research  uuid;
  v_l_infra     uuid;
begin
  -- Skip if user already has a board
  if exists (select 1 from public.boards where owner_id = p_user) then
    return null;
  end if;

  insert into public.boards (title, color, owner_id, starred)
  values ('Flowboard — Product', '#5B5BF5', p_user, true)
  returning id into v_board_id;

  insert into public.columns (board_id, title, wip_limit, position) values
    (v_board_id, 'Backlog',     0, 'a0'),
    (v_board_id, 'To do',       5, 'a1'),
    (v_board_id, 'In progress', 3, 'a2'),
    (v_board_id, 'Review',      2, 'a3'),
    (v_board_id, 'Done',        0, 'a4')
  returning id into v_col_backlog;

  select id into v_col_backlog from public.columns where board_id = v_board_id and title = 'Backlog';
  select id into v_col_todo    from public.columns where board_id = v_board_id and title = 'To do';
  select id into v_col_doing   from public.columns where board_id = v_board_id and title = 'In progress';
  select id into v_col_review  from public.columns where board_id = v_board_id and title = 'Review';
  select id into v_col_done    from public.columns where board_id = v_board_id and title = 'Done';

  insert into public.labels (board_id, name, color) values
    (v_board_id, 'bug',      '#E25C4B'),
    (v_board_id, 'feature',  '#3E7CE0'),
    (v_board_id, 'design',   '#8B5BD9'),
    (v_board_id, 'research', '#D49A2E'),
    (v_board_id, 'infra',    '#4A8C6F');

  select id into v_l_bug      from public.labels where board_id = v_board_id and name = 'bug';
  select id into v_l_feat     from public.labels where board_id = v_board_id and name = 'feature';
  select id into v_l_design   from public.labels where board_id = v_board_id and name = 'design';
  select id into v_l_research from public.labels where board_id = v_board_id and name = 'research';
  select id into v_l_infra    from public.labels where board_id = v_board_id and name = 'infra';

  -- A few sample cards
  insert into public.cards (board_id, column_id, title, description, priority, due_at, position, created_by)
  values
    (v_board_id, v_col_todo, 'Password reset email bounces',
     'Support flagged three reports this week. Likely DMARC-related on gmail workspace domains.',
     'high', now() + interval '2 days', 'a0', p_user),
    (v_board_id, v_col_doing, 'Kanban drag-drop perf on 200+ cards',
     'Boards with >200 cards stutter during drag. Need virtualization + write batching.',
     'high', now() + interval '5 days', 'a0', p_user),
    (v_board_id, v_col_backlog, 'Audit onboarding drop-off funnel',
     '', 'low', null, 'a0', p_user),
    (v_board_id, v_col_review, 'Board background picker', '', 'low', null, 'a0', p_user),
    (v_board_id, v_col_done, 'Set up CI for preview deploys', '', null, null, 'a0', p_user);

  -- Personal board
  insert into public.boards (title, color, owner_id, starred)
  values ('Personal', '#2E7D6A', p_user, false)
  returning id into v_board_id;

  insert into public.columns (board_id, title, wip_limit, position) values
    (v_board_id, 'Inbox',     0, 'a0'),
    (v_board_id, 'This week', 5, 'a1'),
    (v_board_id, 'Done',      0, 'a2');

  return v_board_id;
end;
$$;

grant execute on function public.seed_demo_workspace(uuid) to authenticated;
