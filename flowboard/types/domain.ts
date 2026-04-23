import type { Database, BoardRole, CardPriority, SprintStatus } from "./database";

type T = Database["public"]["Tables"];

export type Profile = T["profiles"]["Row"];
export type Board = T["boards"]["Row"];
export type BoardMember = T["board_members"]["Row"];
export type Column = T["columns"]["Row"];
export type Label = T["labels"]["Row"];
export type CardRow = T["cards"]["Row"];
export type ChecklistItem = T["checklist_items"]["Row"];
export type Comment = T["comments"]["Row"];
export type Activity = T["activities"]["Row"];
export type Sprint = T["sprints"]["Row"];
export type SprintArchivedCard = T["sprint_archived_cards"]["Row"];

export type { BoardRole, CardPriority, SprintStatus };

// Hydrated card with its joined collections
export interface Card extends CardRow {
  labels: string[]; // label ids
  assignees: string[]; // user ids
  watchers: string[]; // user ids
  checklist_count: number;
  checklist_done: number;
  comment_count: number;
}

// Hydrated card detail (used by modal)
export interface CardDetail extends CardRow {
  labels: Label[];
  assignees: Profile[];
  watchers: Profile[];
  checklist: ChecklistItem[];
  comments: (Comment & { author: Profile | null })[];
}

export interface BoardDetail {
  board: Board;
  members: (BoardMember & { profile: Profile })[];
  columns: Column[];
  cards: Card[];
  labels: Label[];
}

export interface ActivityWithActor extends Activity {
  actor: Profile | null;
}

export interface SprintArchiveDetail {
  sprint: Sprint;
  cards: SprintArchivedCard[];
}

export interface ListCard extends Card {
  board_title: string;
  board_color: string;
  column_title: string;
  label_objects: { id: string; name: string; color: string }[];
  assignee_profiles: { id: string; name: string; initials: string; color: string }[];
}
