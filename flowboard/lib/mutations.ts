"use server";

import { auth } from "./auth";
import { db } from "./db";
import { positionAtEnd, positionForIndex } from "./ordering";
import type { CardPriority } from "@/types/database";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

async function requireAdmin() {
  const userId = await requireUser();
  const rows = await db`SELECT is_admin FROM profiles WHERE id = ${userId} LIMIT 1`;
  if (!rows.length || !rows[0].is_admin) throw new Error("Admin yetkisi gerekli");
  return userId;
}

// ----------------------------------------------------------------------------
// Boards
// ----------------------------------------------------------------------------
export async function createBoard(args: {
  title: string;
  ownerId?: string;
  color?: string;
  started_at?: string | null;
  estimated_finished_at?: string | null;
}): Promise<string> {
  const userId = await requireAdmin();
  const color = args.color ?? "#5B5BF5";

  const rows = await db`
    INSERT INTO boards (title, owner_id, color, started_at, estimated_finished_at)
    VALUES (${args.title}, ${userId}, ${color}, ${args.started_at ?? null}, ${args.estimated_finished_at ?? null})
    RETURNING id
  `;
  const boardId = rows[0].id as string;

  await db`
    INSERT INTO columns (board_id, title, position) VALUES
      (${boardId}, 'To do',       'a0'),
      (${boardId}, 'In progress', 'a1'),
      (${boardId}, 'Done',        'a2')
  `;

  await db`
    INSERT INTO activities (board_id, actor_id, type, payload)
    VALUES (${boardId}, ${userId}, 'board_created', ${JSON.stringify({ title: args.title })})
  `;

  return boardId;
}

export async function updateBoard(
  boardId: string,
  patch: { title?: string; color?: string; starred?: boolean; started_at?: string | null; estimated_finished_at?: string | null }
) {
  await requireUser();
  const fields = Object.entries(patch).filter(([, v]) => v !== undefined);
  if (!fields.length) return;
  for (const [key, value] of fields) {
    if (key === "title")                  await db`UPDATE boards SET title                  = ${value as string}  WHERE id = ${boardId}`;
    if (key === "color")                  await db`UPDATE boards SET color                  = ${value as string}  WHERE id = ${boardId}`;
    if (key === "starred")                await db`UPDATE boards SET starred                = ${value as boolean} WHERE id = ${boardId}`;
    if (key === "started_at")             await db`UPDATE boards SET started_at             = ${(value ?? null) as string | null} WHERE id = ${boardId}`;
    if (key === "estimated_finished_at")  await db`UPDATE boards SET estimated_finished_at  = ${(value ?? null) as string | null} WHERE id = ${boardId}`;
  }
}

export async function deleteBoard(boardId: string) {
  await requireAdmin();
  await db`DELETE FROM boards WHERE id = ${boardId}`;
}

export async function addBoardMember(args: {
  boardId: string;
  userId: string;
  role?: "editor" | "viewer";
}) {
  await requireAdmin();
  await db`
    INSERT INTO board_members (board_id, user_id, role)
    VALUES (${args.boardId}, ${args.userId}, ${args.role ?? "editor"})
    ON CONFLICT (board_id, user_id) DO UPDATE SET role = EXCLUDED.role
  `;
}

export async function removeBoardMember(args: { boardId: string; userId: string }) {
  const adminId = await requireAdmin();
  if (args.userId === adminId) throw new Error("Kendinizi boarddan çıkaramazsınız");
  await db`
    DELETE FROM board_members
    WHERE board_id = ${args.boardId} AND user_id = ${args.userId} AND role != 'owner'
  `;
}

// ----------------------------------------------------------------------------
// Columns
// ----------------------------------------------------------------------------
export async function addColumn(args: {
  boardId: string;
  title: string;
  siblingsPositions: string[];
}) {
  await requireUser();
  const position = positionAtEnd(args.siblingsPositions);
  await db`
    INSERT INTO columns (board_id, title, position)
    VALUES (${args.boardId}, ${args.title}, ${position})
  `;
}

export async function updateColumn(
  colId: string,
  patch: { title?: string; wip_limit?: number; position?: string }
) {
  await requireUser();
  if (patch.title !== undefined)
    await db`UPDATE columns SET title = ${patch.title} WHERE id = ${colId}`;
  if (patch.wip_limit !== undefined)
    await db`UPDATE columns SET wip_limit = ${patch.wip_limit} WHERE id = ${colId}`;
  if (patch.position !== undefined)
    await db`UPDATE columns SET position = ${patch.position} WHERE id = ${colId}`;
}

export async function deleteColumn(colId: string) {
  await requireUser();
  await db`DELETE FROM columns WHERE id = ${colId}`;
}

export async function moveColumn(args: { colId: string; newPosition: string }) {
  await requireUser();
  await db`UPDATE columns SET position = ${args.newPosition} WHERE id = ${args.colId}`;
}

// ----------------------------------------------------------------------------
// Cards
// ----------------------------------------------------------------------------
export async function addCard(args: {
  boardId: string;
  columnId: string;
  title: string;
  siblingsPositions: string[];
  actorId?: string;
}): Promise<string> {
  const userId = await requireUser();
  const position = positionAtEnd(args.siblingsPositions);

  const rows = await db`
    INSERT INTO cards (board_id, column_id, title, position, created_by)
    VALUES (${args.boardId}, ${args.columnId}, ${args.title}, ${position}, ${userId})
    RETURNING id
  `;
  const cardId = rows[0].id as string;

  await db`
    INSERT INTO activities (board_id, card_id, actor_id, type, payload)
    VALUES (
      ${args.boardId}, ${cardId}, ${userId},
      'card_created', ${JSON.stringify({ title: args.title })}
    )
  `;

  return cardId;
}

export async function updateCard(
  cardId: string,
  patch: {
    title?: string;
    description?: string;
    priority?: CardPriority | null;
    due_at?: string | null;
    start_at?: string | null;
    story_points?: number | null;
  },
  context?: { boardId: string }
) {
  const userId = await requireUser();

  let current: Record<string, unknown> | null = null;
  if (context?.boardId) {
    const rows = await db`SELECT title, description, priority, due_at, start_at FROM cards WHERE id = ${cardId}`;
    current = rows[0] ?? null;
  }

  if (patch.title !== undefined)
    await db`UPDATE cards SET title = ${patch.title} WHERE id = ${cardId}`;
  if (patch.description !== undefined)
    await db`UPDATE cards SET description = ${patch.description} WHERE id = ${cardId}`;
  if ("priority" in patch)
    await db`UPDATE cards SET priority = ${patch.priority ?? null} WHERE id = ${cardId}`;
  if ("due_at" in patch)
    await db`UPDATE cards SET due_at = ${patch.due_at ?? null} WHERE id = ${cardId}`;
  if ("start_at" in patch)
    await db`UPDATE cards SET start_at = ${patch.start_at ?? null} WHERE id = ${cardId}`;
  if ("story_points" in patch)
    await db`UPDATE cards SET story_points = ${patch.story_points ?? null} WHERE id = ${cardId}`;

  if (context?.boardId && current) {
    const { boardId } = context;
    if (patch.title !== undefined && patch.title !== current.title)
      await db`INSERT INTO activities (board_id, card_id, actor_id, type, payload) VALUES (${boardId}, ${cardId}, ${userId}, 'card_title_changed', ${JSON.stringify({ old: current.title, new: patch.title })})`;
    if (patch.description !== undefined && patch.description !== current.description)
      await db`INSERT INTO activities (board_id, card_id, actor_id, type, payload) VALUES (${boardId}, ${cardId}, ${userId}, 'card_description_changed', ${JSON.stringify({})})`;
    if ("priority" in patch && patch.priority !== current.priority)
      await db`INSERT INTO activities (board_id, card_id, actor_id, type, payload) VALUES (${boardId}, ${cardId}, ${userId}, 'card_priority_changed', ${JSON.stringify({ old: current.priority, new: patch.priority })})`;
    if ("due_at" in patch && patch.due_at !== current.due_at)
      await db`INSERT INTO activities (board_id, card_id, actor_id, type, payload) VALUES (${boardId}, ${cardId}, ${userId}, 'card_due_changed', ${JSON.stringify({ old: current.due_at, new: patch.due_at })})`;
    if ("start_at" in patch && patch.start_at !== current.start_at)
      await db`INSERT INTO activities (board_id, card_id, actor_id, type, payload) VALUES (${boardId}, ${cardId}, ${userId}, 'card_start_changed', ${JSON.stringify({ old: current.start_at, new: patch.start_at })})`;
  }
}

export async function deleteCard(cardId: string, boardId?: string) {
  const userId = await requireUser();

  if (boardId) {
    const rows = await db`SELECT title FROM cards WHERE id = ${cardId}`;
    if (rows.length > 0) {
      await db`
        INSERT INTO activities (board_id, card_id, actor_id, type, payload)
        VALUES (${boardId}, ${cardId}, ${userId}, 'card_deleted',
          ${JSON.stringify({ title: rows[0].title, card_id: cardId })})
      `;
    }
  }

  await db`DELETE FROM cards WHERE id = ${cardId}`;
}

export async function moveCard(args: {
  cardId: string;
  boardId: string;
  fromColumnId: string;
  toColumnId: string;
  siblingsExcludingMoved: string[];
  toIndex: number;
  actorId?: string;
}): Promise<string> {
  const userId = await requireUser();
  const newPosition = positionForIndex(args.siblingsExcludingMoved, args.toIndex);

  await db`
    UPDATE cards SET column_id = ${args.toColumnId}, position = ${newPosition}
    WHERE id = ${args.cardId}
  `;

  if (args.fromColumnId !== args.toColumnId) {
    await db`
      INSERT INTO activities (board_id, card_id, actor_id, type, payload)
      VALUES (
        ${args.boardId}, ${args.cardId}, ${userId},
        'card_moved',
        ${JSON.stringify({ from_column: args.fromColumnId, to_column: args.toColumnId })}
      )
    `;
  }

  return newPosition;
}

// ----------------------------------------------------------------------------
// Card relations (labels / assignees)
// ----------------------------------------------------------------------------
export async function toggleCardLabel(args: {
  cardId: string;
  labelId: string;
  on: boolean;
  boardId?: string;
}) {
  const userId = await requireUser();
  if (args.on) {
    await db`
      INSERT INTO card_labels (card_id, label_id)
      VALUES (${args.cardId}, ${args.labelId})
      ON CONFLICT DO NOTHING
    `;
  } else {
    await db`
      DELETE FROM card_labels WHERE card_id = ${args.cardId} AND label_id = ${args.labelId}
    `;
  }

  if (args.boardId) {
    const labelRows = await db`SELECT name, color FROM labels WHERE id = ${args.labelId}`;
    if (labelRows.length > 0) {
      const type = args.on ? "card_label_added" : "card_label_removed";
      await db`
        INSERT INTO activities (board_id, card_id, actor_id, type, payload)
        VALUES (${args.boardId}, ${args.cardId}, ${userId}, ${type},
          ${JSON.stringify({ label_id: args.labelId, label_name: labelRows[0].name, label_color: labelRows[0].color })})
      `;
    }
  }
}

export async function toggleCardAssignee(args: {
  cardId: string;
  userId: string;
  on: boolean;
  boardId?: string;
}) {
  const actorId = await requireUser();
  if (args.on) {
    await db`
      INSERT INTO card_assignees (card_id, user_id)
      VALUES (${args.cardId}, ${args.userId})
      ON CONFLICT DO NOTHING
    `;
  } else {
    await db`
      DELETE FROM card_assignees WHERE card_id = ${args.cardId} AND user_id = ${args.userId}
    `;
  }

  if (args.boardId) {
    const userRows = await db`SELECT name FROM profiles WHERE id = ${args.userId}`;
    if (userRows.length > 0) {
      const type = args.on ? "card_assignee_added" : "card_assignee_removed";
      await db`
        INSERT INTO activities (board_id, card_id, actor_id, type, payload)
        VALUES (${args.boardId}, ${args.cardId}, ${actorId}, ${type},
          ${JSON.stringify({ user_id: args.userId, user_name: userRows[0].name })})
      `;
    }
  }
}

export async function toggleCardWatcher(args: {
  cardId: string;
  userId: string;
  on: boolean;
}) {
  await requireUser();
  if (args.on) {
    await db`
      INSERT INTO card_watchers (card_id, user_id)
      VALUES (${args.cardId}, ${args.userId})
      ON CONFLICT DO NOTHING
    `;
  } else {
    await db`
      DELETE FROM card_watchers WHERE card_id = ${args.cardId} AND user_id = ${args.userId}
    `;
  }
}

// ----------------------------------------------------------------------------
// Checklist
// ----------------------------------------------------------------------------
export async function addChecklistItem(args: {
  cardId: string;
  text: string;
  siblingsPositions: string[];
  boardId?: string;
}) {
  const userId = await requireUser();
  const position = positionAtEnd(args.siblingsPositions);
  await db`
    INSERT INTO checklist_items (card_id, text, position)
    VALUES (${args.cardId}, ${args.text}, ${position})
  `;

  if (args.boardId) {
    await db`
      INSERT INTO activities (board_id, card_id, actor_id, type, payload)
      VALUES (${args.boardId}, ${args.cardId}, ${userId}, 'card_checklist_added',
        ${JSON.stringify({ text: args.text })})
    `;
  }
}

export async function toggleChecklistItem(
  itemId: string,
  done: boolean,
  context?: { boardId: string; cardId: string }
) {
  const userId = await requireUser();

  if (context) {
    const rows = await db`SELECT text FROM checklist_items WHERE id = ${itemId}`;
    if (rows.length > 0) {
      const type = done ? "card_checklist_done" : "card_checklist_undone";
      await db`
        INSERT INTO activities (board_id, card_id, actor_id, type, payload)
        VALUES (${context.boardId}, ${context.cardId}, ${userId}, ${type},
          ${JSON.stringify({ text: rows[0].text })})
      `;
    }
  }

  await db`UPDATE checklist_items SET done = ${done} WHERE id = ${itemId}`;
}

export async function deleteChecklistItem(
  itemId: string,
  context?: { boardId: string; cardId: string }
) {
  const userId = await requireUser();

  if (context) {
    const rows = await db`SELECT text FROM checklist_items WHERE id = ${itemId}`;
    if (rows.length > 0) {
      await db`
        INSERT INTO activities (board_id, card_id, actor_id, type, payload)
        VALUES (${context.boardId}, ${context.cardId}, ${userId}, 'card_checklist_deleted',
          ${JSON.stringify({ text: rows[0].text })})
      `;
    }
  }

  await db`DELETE FROM checklist_items WHERE id = ${itemId}`;
}

// ----------------------------------------------------------------------------
// Comments
// ----------------------------------------------------------------------------
export async function addComment(args: {
  cardId: string;
  boardId: string;
  authorId?: string;
  text: string;
  attachment?: {
    url: string;
    key: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  };
}) {
  const userId = await requireUser();
  const rows = await db`
    INSERT INTO comments (card_id, author_id, text)
    VALUES (${args.cardId}, ${userId}, ${args.text})
    RETURNING id
  `;
  const commentId = rows[0].id as string;

  if (args.attachment) {
    await db`
      INSERT INTO comment_attachments (comment_id, file_key, file_name, file_size, mime_type, url)
      VALUES (
        ${commentId},
        ${args.attachment.key},
        ${args.attachment.fileName},
        ${args.attachment.fileSize},
        ${args.attachment.mimeType},
        ${args.attachment.url}
      )
    `;
  }

  await db`
    INSERT INTO activities (board_id, card_id, actor_id, type, payload)
    VALUES (
      ${args.boardId}, ${args.cardId}, ${userId},
      'card_commented',
      ${JSON.stringify({ text: args.text.slice(0, 80) })}
    )
  `;
}

export async function deleteComment(commentId: string) {
  const userId = await requireUser();
  // Only the author can delete their comment
  await db`
    DELETE FROM comments
    WHERE id = ${commentId} AND author_id = ${userId}
  `;
}

// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// Labels
// ----------------------------------------------------------------------------
export async function addLabel(args: {
  boardId: string;
  name: string;
  color: string;
}) {
  await requireUser();
  await db`
    INSERT INTO labels (board_id, name, color)
    VALUES (${args.boardId}, ${args.name}, ${args.color})
  `;
}

export async function updateLabel(
  labelId: string,
  patch: { name?: string; color?: string }
) {
  await requireUser();
  if (patch.name !== undefined)
    await db`UPDATE labels SET name = ${patch.name} WHERE id = ${labelId}`;
  if (patch.color !== undefined)
    await db`UPDATE labels SET color = ${patch.color} WHERE id = ${labelId}`;
}

export async function deleteLabel(labelId: string) {
  await requireUser();
  await db`DELETE FROM labels WHERE id = ${labelId}`;
}

// ----------------------------------------------------------------------------
// Sprints
// ----------------------------------------------------------------------------
export async function startSprint(args: {
  boardId: string;
  title: string;
  goal?: string;
}): Promise<string> {
  await requireAdmin();

  // Check no active sprint exists
  const existing = await db`
    SELECT id FROM sprints WHERE board_id = ${args.boardId} AND status = 'active' LIMIT 1
  `;
  if (existing.length > 0) throw new Error("A sprint is already active on this board");

  // Get next sprint number
  const countRows = await db`
    SELECT COALESCE(MAX(sprint_number), 0) + 1 AS next_num FROM sprints WHERE board_id = ${args.boardId}
  `;
  const nextNum = Number(countRows[0].next_num);

  const rows = await db`
    INSERT INTO sprints (board_id, title, sprint_number, goal)
    VALUES (${args.boardId}, ${args.title}, ${nextNum}, ${args.goal ?? ''})
    RETURNING id
  `;
  return rows[0].id as string;
}

export async function completeSprint(args: {
  sprintId: string;
  boardId: string;
}): Promise<number> {
  await requireAdmin();

  // Find the "Done" column (case-insensitive match)
  const doneCols = await db`
    SELECT id, title FROM columns
    WHERE board_id = ${args.boardId}
      AND LOWER(title) = 'done'
  `;
  if (doneCols.length === 0) throw new Error("No 'Done' column found");
  const doneColId = doneCols[0].id as string;
  const doneColTitle = doneCols[0].title as string;

  // Check if there are any incomplete cards
  const incompleteCards = await db`
    SELECT id FROM cards 
    WHERE board_id = ${args.boardId} AND column_id != ${doneColId}
    LIMIT 1
  `;
  if (incompleteCards.length > 0) {
    throw new Error("All tasks must be completed before ending the sprint.");
  }

  // Get all cards in Done column with their denormalized data
  const doneCards = await db`
    SELECT c.*,
      COALESCE(
        (SELECT p.name FROM profiles p WHERE p.id = c.created_by), NULL
      ) AS creator_name,
      COALESCE(
        ARRAY(
          SELECT p.name FROM card_assignees ca JOIN profiles p ON p.id = ca.user_id WHERE ca.card_id = c.id
        ), '{}'
      ) AS assignee_names,
      COALESCE(
        ARRAY(
          SELECT ca.user_id FROM card_assignees ca WHERE ca.card_id = c.id
        ), '{}'
      ) AS assignee_ids,
      COALESCE(
        ARRAY(
          SELECT p.name FROM card_watchers cw JOIN profiles p ON p.id = cw.user_id WHERE cw.card_id = c.id
        ), '{}'
      ) AS watcher_names,
      COALESCE(
        ARRAY(
          SELECT l.name FROM card_labels cl JOIN labels l ON l.id = cl.label_id WHERE cl.card_id = c.id
        ), '{}'
      ) AS label_names,
      COALESCE(
        ARRAY(
          SELECT l.color FROM card_labels cl JOIN labels l ON l.id = cl.label_id WHERE cl.card_id = c.id
        ), '{}'
      ) AS label_colors,
      (SELECT COUNT(*)::int FROM checklist_items ci WHERE ci.card_id = c.id) AS checklist_total,
      (SELECT COUNT(*)::int FROM checklist_items ci WHERE ci.card_id = c.id AND ci.done = true) AS checklist_done_count,
      (SELECT COUNT(*)::int FROM comments co WHERE co.card_id = c.id) AS comment_total
    FROM cards c
    WHERE c.column_id = ${doneColId} AND c.board_id = ${args.boardId}
    ORDER BY c.position COLLATE "C"
  `;

  // Insert snapshot rows
  for (const card of doneCards) {
    await db`
      INSERT INTO sprint_archived_cards (
        sprint_id, board_id, card_title, card_description, card_priority,
        card_start_at, card_due_at, column_title, created_by_name, assignee_names, assignee_ids, watcher_names,
        label_names, label_colors, checklist_total, checklist_done, comment_count, story_points
      ) VALUES (
        ${args.sprintId}, ${args.boardId}, ${card.title}, ${card.description ?? ''},
        ${card.priority ?? null}, ${card.start_at ?? null}, ${card.due_at ?? null}, ${doneColTitle},
        ${card.creator_name ?? null},
        ${card.assignee_names as string[]}, ${card.assignee_ids as string[]}, ${card.watcher_names as string[]},
        ${card.label_names as string[]}, ${card.label_colors as string[]},
        ${Number(card.checklist_total)}, ${Number(card.checklist_done_count)},
        ${Number(card.comment_total)}, ${card.story_points ?? null}
      )
    `;
  }

  // Delete done cards
  await db`DELETE FROM cards WHERE column_id = ${doneColId} AND board_id = ${args.boardId}`;

  // Mark sprint as completed
  await db`
    UPDATE sprints SET status = 'completed', ended_at = now()
    WHERE id = ${args.sprintId}
  `;

  return doneCards.length;
}

