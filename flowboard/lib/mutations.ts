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
}): Promise<string> {
  const userId = await requireAdmin();
  const color = args.color ?? "#5B5BF5";

  const rows = await db`
    INSERT INTO boards (title, owner_id, color)
    VALUES (${args.title}, ${userId}, ${color})
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
  patch: { title?: string; color?: string; starred?: boolean }
) {
  await requireUser();
  const fields = Object.entries(patch).filter(([, v]) => v !== undefined);
  if (!fields.length) return;
  // Build dynamic update using raw SQL per field
  for (const [key, value] of fields) {
    if (key === "title")   await db`UPDATE boards SET title   = ${value as string}  WHERE id = ${boardId}`;
    if (key === "color")   await db`UPDATE boards SET color   = ${value as string}  WHERE id = ${boardId}`;
    if (key === "starred") await db`UPDATE boards SET starred = ${value as boolean} WHERE id = ${boardId}`;
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
  }
) {
  await requireUser();
  if (patch.title !== undefined)
    await db`UPDATE cards SET title = ${patch.title} WHERE id = ${cardId}`;
  if (patch.description !== undefined)
    await db`UPDATE cards SET description = ${patch.description} WHERE id = ${cardId}`;
  if ("priority" in patch)
    await db`UPDATE cards SET priority = ${patch.priority ?? null} WHERE id = ${cardId}`;
  if ("due_at" in patch)
    await db`UPDATE cards SET due_at = ${patch.due_at ?? null} WHERE id = ${cardId}`;
}

export async function deleteCard(cardId: string) {
  await requireUser();
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
}) {
  await requireUser();
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
}

export async function toggleCardAssignee(args: {
  cardId: string;
  userId: string;
  on: boolean;
}) {
  await requireUser();
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
}) {
  await requireUser();
  const position = positionAtEnd(args.siblingsPositions);
  await db`
    INSERT INTO checklist_items (card_id, text, position)
    VALUES (${args.cardId}, ${args.text}, ${position})
  `;
}

export async function toggleChecklistItem(itemId: string, done: boolean) {
  await requireUser();
  await db`UPDATE checklist_items SET done = ${done} WHERE id = ${itemId}`;
}

export async function deleteChecklistItem(itemId: string) {
  await requireUser();
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
}) {
  const userId = await requireUser();
  await db`
    INSERT INTO comments (card_id, author_id, text)
    VALUES (${args.cardId}, ${userId}, ${args.text})
  `;
  await db`
    INSERT INTO activities (board_id, card_id, actor_id, type, payload)
    VALUES (
      ${args.boardId}, ${args.cardId}, ${userId},
      'card_commented',
      ${JSON.stringify({ text: args.text.slice(0, 80) })}
    )
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
