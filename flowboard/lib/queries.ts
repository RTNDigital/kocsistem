"use server";

import { auth } from "./auth";
import { db } from "./db";
import type {
  BoardDetail,
  Card,
  CardDetail,
  ActivityWithActor,
  Profile,
  Board,
  Sprint,
  SprintArchivedCard,
  SprintArchiveDetail,
  ListCard,
} from "@/types/domain";

// ----------------------------------------------------------------------------
// Profiles
// ----------------------------------------------------------------------------
export async function getMe(): Promise<Profile | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const rows = await db`SELECT * FROM profiles WHERE id = ${session.user.id}`;
  return (rows[0] as unknown as Profile) ?? null;
}

export async function listAllProfiles(): Promise<Profile[]> {
  const session = await auth();
  if (!session?.user?.id) return [];
  const rows = await db`SELECT * FROM profiles ORDER BY name`;
  return rows as unknown as Profile[];
}

// ----------------------------------------------------------------------------
// Boards
// ----------------------------------------------------------------------------
export async function listBoards(): Promise<Board[]> {
  const session = await auth();
  if (!session?.user?.id) return [];
  const rows = await db`
    SELECT b.* FROM boards b
    JOIN board_members bm ON bm.board_id = b.id
    WHERE bm.user_id = ${session.user.id}
    ORDER BY b.created_at DESC
  `;
  return rows as unknown as Board[];
}

export async function getBoardDetail(boardId: string): Promise<BoardDetail | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [boardRows, memberRows, columnRows, cardRows, labelRows] = await Promise.all([
    db`SELECT * FROM boards WHERE id = ${boardId}`,
    db`
      SELECT bm.board_id, bm.user_id, bm.role, bm.added_at,
             p.id as p_id, p.email as p_email, p.name as p_name,
             p.initials as p_initials, p.color as p_color, p.created_at as p_created_at
      FROM board_members bm
      JOIN profiles p ON p.id = bm.user_id
      WHERE bm.board_id = ${boardId}
    `,
    db`SELECT * FROM columns WHERE board_id = ${boardId} ORDER BY position`,
    db`
      SELECT c.*,
        COALESCE(
          json_agg(DISTINCT cl.label_id) FILTER (WHERE cl.label_id IS NOT NULL), '[]'
        ) AS label_ids,
        COALESCE(
          json_agg(DISTINCT ca.user_id) FILTER (WHERE ca.user_id IS NOT NULL), '[]'
        ) AS assignee_ids,
        COALESCE(
          json_agg(DISTINCT cw.user_id) FILTER (WHERE cw.user_id IS NOT NULL), '[]'
        ) AS watcher_ids,
        COUNT(DISTINCT ci.id) AS checklist_count,
        COUNT(DISTINCT ci.id) FILTER (WHERE ci.done = true) AS checklist_done,
        COUNT(DISTINCT co.id) AS comment_count
      FROM cards c
      LEFT JOIN card_labels cl ON cl.card_id = c.id
      LEFT JOIN card_assignees ca ON ca.card_id = c.id
      LEFT JOIN card_watchers cw ON cw.card_id = c.id
      LEFT JOIN checklist_items ci ON ci.card_id = c.id
      LEFT JOIN comments co ON co.card_id = c.id
      WHERE c.board_id = ${boardId}
      GROUP BY c.id
      ORDER BY c.position
    `,
    db`SELECT * FROM labels WHERE board_id = ${boardId} ORDER BY name`,
  ]);

  if (!boardRows.length) return null;

  // Verify access
  const hasAccess = memberRows.some((m) => m.user_id === session.user.id);
  if (!hasAccess) return null;

  const cards: Card[] = cardRows.map((c) => ({
    id: c.id as string,
    board_id: c.board_id as string,
    column_id: c.column_id as string,
    title: c.title as string,
    description: c.description as string,
    priority: c.priority as Card["priority"],
    start_at: c.start_at as string | null,
    due_at: c.due_at as string | null,
    position: c.position as string,
    created_by: c.created_by as string | null,
    created_at: c.created_at as string,
    labels: (c.label_ids as string[]) ?? [],
    assignees: (c.assignee_ids as string[]) ?? [],
    watchers: (c.watcher_ids as string[]) ?? [],
    checklist_count: Number(c.checklist_count),
    checklist_done: Number(c.checklist_done),
    comment_count: Number(c.comment_count),
  }));

  const members = memberRows.map((m) => ({
    board_id: m.board_id as string,
    user_id: m.user_id as string,
    role: m.role as string,
    added_at: m.added_at as string,
    profile: {
      id: m.p_id as string,
      email: m.p_email as string,
      name: m.p_name as string,
      initials: m.p_initials as string,
      color: m.p_color as string,
      created_at: m.p_created_at as string,
    },
  }));

  return {
    board: boardRows[0] as unknown as Board,
    members: members as BoardDetail["members"],
    columns: columnRows as unknown as BoardDetail["columns"],
    cards,
    labels: labelRows as unknown as BoardDetail["labels"],
  };
}

// ----------------------------------------------------------------------------
// Card detail (modal)
// ----------------------------------------------------------------------------
export async function getCardDetail(cardId: string): Promise<CardDetail | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [cardRows, labelRows, assigneeRows, watcherRows, checklistRows, commentRows] = await Promise.all([
    db`SELECT * FROM cards WHERE id = ${cardId}`,
    db`
      SELECT l.* FROM labels l
      JOIN card_labels cl ON cl.label_id = l.id
      WHERE cl.card_id = ${cardId}
    `,
    db`
      SELECT p.* FROM profiles p
      JOIN card_assignees ca ON ca.user_id = p.id
      WHERE ca.card_id = ${cardId}
    `,
    db`
      SELECT p.* FROM profiles p
      JOIN card_watchers cw ON cw.user_id = p.id
      WHERE cw.card_id = ${cardId}
    `,
    db`SELECT * FROM checklist_items WHERE card_id = ${cardId} ORDER BY position`,
    db`
      SELECT c.*, p.id as a_id, p.name as a_name, p.email as a_email,
             p.initials as a_initials, p.color as a_color, p.created_at as a_created_at
      FROM comments c
      JOIN profiles p ON p.id = c.author_id
      WHERE c.card_id = ${cardId}
      ORDER BY c.created_at DESC
    `,
  ]);

  if (!cardRows.length) return null;
  const card = cardRows[0];

  const comments = commentRows.map((c) => ({
    id: c.id as string,
    card_id: c.card_id as string,
    author_id: c.author_id as string,
    text: c.text as string,
    created_at: c.created_at as string,
    author: {
      id: c.a_id as string,
      name: c.a_name as string,
      email: c.a_email as string,
      initials: c.a_initials as string,
      color: c.a_color as string,
      is_admin: false as boolean,
      created_at: c.a_created_at as string,
    },
  }));

  return {
    id: card.id as string,
    board_id: card.board_id as string,
    column_id: card.column_id as string,
    title: card.title as string,
    description: card.description as string,
    priority: card.priority as CardDetail["priority"],
    start_at: card.start_at as string | null,
    due_at: card.due_at as string | null,
    position: card.position as string,
    created_by: card.created_by as string | null,
    created_at: card.created_at as string,
    labels: labelRows as unknown as CardDetail["labels"],
    assignees: assigneeRows as unknown as CardDetail["assignees"],
    watchers: watcherRows as unknown as CardDetail["watchers"],
    checklist: checklistRows as unknown as CardDetail["checklist"],
    comments,
  };
}

// ----------------------------------------------------------------------------
// Activity feed
// ----------------------------------------------------------------------------
export async function recentActivity(limit = 8): Promise<ActivityWithActor[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const rows = await db`
    SELECT a.*, p.id as ac_id, p.name as ac_name, p.email as ac_email,
           p.initials as ac_initials, p.color as ac_color, p.created_at as ac_created_at
    FROM activities a
    JOIN board_members bm ON bm.board_id = a.board_id AND bm.user_id = ${session.user.id}
    LEFT JOIN profiles p ON p.id = a.actor_id
    ORDER BY a.created_at DESC
    LIMIT ${limit}
  `;

  return rows.map((r) => ({
    id: r.id as string,
    board_id: r.board_id as string,
    card_id: r.card_id as string | null,
    actor_id: r.actor_id as string,
    type: r.type as ActivityWithActor["type"],
    payload: r.payload as ActivityWithActor["payload"],
    created_at: r.created_at as string,
    actor: r.ac_id
      ? {
          id: r.ac_id as string,
          name: r.ac_name as string,
          email: r.ac_email as string,
          initials: r.ac_initials as string,
          color: r.ac_color as string,
          created_at: r.ac_created_at as string,
        }
      : null,
  })) as ActivityWithActor[];
}

// ----------------------------------------------------------------------------
// Card-level activity log
// ----------------------------------------------------------------------------
export async function getCardActivities(cardId: string): Promise<ActivityWithActor[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const rows = await db`
    SELECT a.*, p.id as ac_id, p.name as ac_name, p.email as ac_email,
           p.initials as ac_initials, p.color as ac_color, p.created_at as ac_created_at
    FROM activities a
    JOIN board_members bm ON bm.board_id = a.board_id AND bm.user_id = ${session.user.id}
    LEFT JOIN profiles p ON p.id = a.actor_id
    WHERE a.card_id = ${cardId}
    ORDER BY a.created_at ASC
  `;

  return rows.map((r) => ({
    id: r.id as string,
    board_id: r.board_id as string,
    card_id: r.card_id as string | null,
    actor_id: r.actor_id as string,
    type: r.type as ActivityWithActor["type"],
    payload: r.payload as ActivityWithActor["payload"],
    created_at: r.created_at as string,
    actor: r.ac_id
      ? {
          id: r.ac_id as string,
          name: r.ac_name as string,
          email: r.ac_email as string,
          initials: r.ac_initials as string,
          color: r.ac_color as string,
          is_admin: false,
          created_at: r.ac_created_at as string,
        }
      : null,
  })) as ActivityWithActor[];
}

// Admin: activities for deleted cards (card_id became NULL after SET NULL)
export async function getDeletedCardActivities(): Promise<ActivityWithActor[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const profile = await db`SELECT is_admin FROM profiles WHERE id = ${session.user.id}`;
  if (!profile.length || !profile[0].is_admin) return [];

  const rows = await db`
    SELECT a.*, p.id as ac_id, p.name as ac_name, p.email as ac_email,
           p.initials as ac_initials, p.color as ac_color, p.created_at as ac_created_at
    FROM activities a
    LEFT JOIN profiles p ON p.id = a.actor_id
    WHERE a.card_id IS NULL
      AND a.type != 'board_created'
      AND a.payload->>'card_id' IS NOT NULL
    ORDER BY a.created_at DESC
    LIMIT 200
  `;

  return rows.map((r) => ({
    id: r.id as string,
    board_id: r.board_id as string,
    card_id: null,
    actor_id: r.actor_id as string,
    type: r.type as ActivityWithActor["type"],
    payload: r.payload as ActivityWithActor["payload"],
    created_at: r.created_at as string,
    actor: r.ac_id
      ? {
          id: r.ac_id as string,
          name: r.ac_name as string,
          email: r.ac_email as string,
          initials: r.ac_initials as string,
          color: r.ac_color as string,
          is_admin: false,
          created_at: r.ac_created_at as string,
        }
      : null,
  })) as ActivityWithActor[];
}

// ----------------------------------------------------------------------------
// Seed demo workspace (calls SQL function)
// ----------------------------------------------------------------------------
export async function seedDemoWorkspace(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  await db`SELECT seed_demo_workspace(${session.user.id}::uuid)`;
}

// ----------------------------------------------------------------------------
// Sprints
// ----------------------------------------------------------------------------
export async function getActiveSprint(boardId: string): Promise<Sprint | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const rows = await db`
    SELECT * FROM sprints
    WHERE board_id = ${boardId} AND status = 'active'
    LIMIT 1
  `;
  return rows.length ? (rows[0] as unknown as Sprint) : null;
}

export async function listSprintArchives(boardId: string): Promise<Sprint[]> {
  const session = await auth();
  if (!session?.user?.id) return [];
  const rows = await db`
    SELECT s.*,
      (SELECT COUNT(*)::int FROM sprint_archived_cards sac WHERE sac.sprint_id = s.id) AS card_count
    FROM sprints s
    WHERE s.board_id = ${boardId} AND s.status = 'completed'
    ORDER BY s.ended_at DESC
  `;
  return rows as unknown as Sprint[];
}

// ----------------------------------------------------------------------------
// Timeline: boards with their sprints
// ----------------------------------------------------------------------------
export interface BoardWithSprints {
  id: string;
  title: string;
  color: string;
  starred: boolean;
  created_at: string;
  started_at: string | null;
  estimated_finished_at: string | null;
  sprints: Sprint[];
}

export async function listBoardsWithSprints(): Promise<BoardWithSprints[]> {
  const session = await auth();
  if (!session?.user?.id) return [];
  const rows = await db`
    SELECT b.id, b.title, b.color, b.starred, b.created_at, b.started_at, b.estimated_finished_at,
      COALESCE(
        json_agg(
          json_build_object(
            'id', s.id,
            'title', s.title,
            'sprint_number', s.sprint_number,
            'status', s.status,
            'started_at', s.started_at,
            'ended_at', s.ended_at
          ) ORDER BY s.started_at
        ) FILTER (WHERE s.id IS NOT NULL),
        '[]'::json
      ) AS sprints
    FROM boards b
    JOIN board_members bm ON bm.board_id = b.id AND bm.user_id = ${session.user.id}
    LEFT JOIN sprints s ON s.board_id = b.id
    GROUP BY b.id, b.title, b.color, b.starred, b.created_at, b.started_at, b.estimated_finished_at
    ORDER BY b.created_at ASC
  `;
  return rows as unknown as BoardWithSprints[];
}

// ----------------------------------------------------------------------------
// List view: all cards across accessible boards
// ----------------------------------------------------------------------------
export async function listAllCards(): Promise<ListCard[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const rows = await db`
    SELECT
      c.*,
      b.title  AS board_title,
      b.color  AS board_color,
      col.title AS column_title,
      COALESCE(
        json_agg(DISTINCT cl.label_id) FILTER (WHERE cl.label_id IS NOT NULL), '[]'
      ) AS label_ids,
      COALESCE(
        jsonb_agg(
          DISTINCT jsonb_build_object('id', l.id, 'name', l.name, 'color', l.color)
        ) FILTER (WHERE l.id IS NOT NULL), '[]'
      ) AS label_objects,
      COALESCE(
        json_agg(DISTINCT ca.user_id) FILTER (WHERE ca.user_id IS NOT NULL), '[]'
      ) AS assignee_ids,
      COALESCE(
        jsonb_agg(
          DISTINCT jsonb_build_object('id', p.id, 'name', p.name, 'initials', p.initials, 'color', p.color)
        ) FILTER (WHERE p.id IS NOT NULL), '[]'
      ) AS assignee_profiles,
      COALESCE(
        json_agg(DISTINCT cw.user_id) FILTER (WHERE cw.user_id IS NOT NULL), '[]'
      ) AS watcher_ids,
      COUNT(DISTINCT ci.id)                               AS checklist_count,
      COUNT(DISTINCT ci.id) FILTER (WHERE ci.done = true) AS checklist_done,
      COUNT(DISTINCT co.id)                               AS comment_count
    FROM cards c
    JOIN board_members bm  ON bm.board_id = c.board_id AND bm.user_id = ${session.user.id}
    JOIN boards b           ON b.id = c.board_id
    JOIN columns col        ON col.id = c.column_id
    LEFT JOIN card_labels   cl ON cl.card_id  = c.id
    LEFT JOIN labels        l  ON l.id        = cl.label_id
    LEFT JOIN card_assignees ca ON ca.card_id = c.id
    LEFT JOIN profiles      p  ON p.id        = ca.user_id
    LEFT JOIN card_watchers cw ON cw.card_id  = c.id
    LEFT JOIN checklist_items ci ON ci.card_id = c.id
    LEFT JOIN comments      co ON co.card_id  = c.id
    GROUP BY c.id, b.title, b.color, col.title
    ORDER BY c.created_at DESC
  `;

  return rows.map((c) => ({
    id:              c.id as string,
    board_id:        c.board_id as string,
    column_id:       c.column_id as string,
    title:           c.title as string,
    description:     c.description as string,
    priority:        c.priority as Card["priority"],
    due_at:          c.due_at as string | null,
    position:        c.position as string,
    start_at:        c.start_at as string | null,
    created_by:      c.created_by as string | null,
    created_at:      c.created_at as string,
    labels:          (c.label_ids as string[]) ?? [],
    assignees:       (c.assignee_ids as string[]) ?? [],
    watchers:        (c.watcher_ids as string[]) ?? [],
    checklist_count: Number(c.checklist_count),
    checklist_done:  Number(c.checklist_done),
    comment_count:   Number(c.comment_count),
    board_title:     c.board_title as string,
    board_color:     c.board_color as string,
    column_title:    c.column_title as string,
    label_objects:   (c.label_objects as ListCard["label_objects"]) ?? [],
    assignee_profiles: (c.assignee_profiles as ListCard["assignee_profiles"]) ?? [],
  }));
}

export async function getSprintArchiveDetail(sprintId: string): Promise<SprintArchiveDetail | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const sprintRows = await db`SELECT * FROM sprints WHERE id = ${sprintId}`;
  if (!sprintRows.length) return null;

  const cardRows = await db`
    SELECT * FROM sprint_archived_cards
    WHERE sprint_id = ${sprintId}
    ORDER BY completed_at
  `;

  return {
    sprint: sprintRows[0] as unknown as Sprint,
    cards: cardRows as unknown as SprintArchivedCard[],
  };
}

