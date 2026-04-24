// Hand-written DB types matching supabase/schema.sql
// Regenerate from `npm run db:types` once you've linked a Supabase project.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type BoardRole = "owner" | "editor" | "viewer";
export type BoardType = "project" | "personal";
export type CardPriority = "low" | "med" | "high";
export type ActivityType =
  | "card_created"
  | "card_moved"
  | "card_completed"
  | "card_commented"
  | "board_created"
  | "card_title_changed"
  | "card_description_changed"
  | "card_priority_changed"
  | "card_due_changed"
  | "card_start_changed"
  | "card_label_added"
  | "card_label_removed"
  | "card_assignee_added"
  | "card_assignee_removed"
  | "card_checklist_added"
  | "card_checklist_done"
  | "card_checklist_undone"
  | "card_checklist_deleted"
  | "card_deleted";
export type SprintStatus = "active" | "completed";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          name: string;
          initials: string;
          color: string;
          is_admin: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          initials: string;
          color?: string;
          is_admin?: boolean;
        };
        Update: Partial<{ name: string; initials: string; color: string; is_admin: boolean }>;
      };
      boards: {
        Row: {
          id: string;
          title: string;
          color: string;
          owner_id: string;
          starred: boolean;
          type: BoardType;
          created_at: string;
          started_at: string | null;
          estimated_finished_at: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          color?: string;
          owner_id: string;
          starred?: boolean;
          type?: BoardType;
          started_at?: string | null;
          estimated_finished_at?: string | null;
        };
        Update: Partial<{ title: string; color: string; starred: boolean; type: BoardType; started_at: string | null; estimated_finished_at: string | null }>;
      };
      board_members: {
        Row: {
          board_id: string;
          user_id: string;
          role: BoardRole;
          added_at: string;
        };
        Insert: {
          board_id: string;
          user_id: string;
          role?: BoardRole;
        };
        Update: Partial<{ role: BoardRole }>;
      };
      columns: {
        Row: {
          id: string;
          board_id: string;
          title: string;
          wip_limit: number;
          position: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          board_id: string;
          title: string;
          wip_limit?: number;
          position: string;
        };
        Update: Partial<{ title: string; wip_limit: number; position: string }>;
      };
      labels: {
        Row: {
          id: string;
          board_id: string;
          name: string;
          color: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          board_id: string;
          name: string;
          color: string;
        };
        Update: Partial<{ name: string; color: string }>;
      };
      cards: {
        Row: {
          id: string;
          board_id: string;
          column_id: string;
          title: string;
          description: string;
          priority: CardPriority | null;
          start_at: string | null;
          due_at: string | null;
          position: string;
          created_by: string | null;
          created_at: string;
          story_points: number | null;
        };
        Insert: {
          id?: string;
          board_id: string;
          column_id: string;
          title: string;
          description?: string;
          priority?: CardPriority | null;
          start_at?: string | null;
          due_at?: string | null;
          position: string;
          created_by?: string | null;
          story_points?: number | null;
        };
        Update: Partial<{
          title: string;
          description: string;
          priority: CardPriority | null;
          start_at: string | null;
          due_at: string | null;
          position: string;
          column_id: string;
          story_points: number | null;
        }>;
      };
      card_labels: {
        Row: { card_id: string; label_id: string };
        Insert: { card_id: string; label_id: string };
        Update: never;
      };
      card_assignees: {
        Row: { card_id: string; user_id: string };
        Insert: { card_id: string; user_id: string };
        Update: never;
      };
      card_watchers: {
        Row: { card_id: string; user_id: string };
        Insert: { card_id: string; user_id: string };
        Update: never;
      };
      checklist_items: {
        Row: {
          id: string;
          card_id: string;
          text: string;
          done: boolean;
          position: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          card_id: string;
          text: string;
          done?: boolean;
          position: string;
        };
        Update: Partial<{ text: string; done: boolean; position: string }>;
      };
      comments: {
        Row: {
          id: string;
          card_id: string;
          author_id: string;
          text: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          card_id: string;
          author_id: string;
          text: string;
        };
        Update: Partial<{ text: string }>;
      };
      comment_attachments: {
        Row: {
          id: string;
          comment_id: string;
          file_key: string;
          file_name: string;
          file_size: number;
          mime_type: string;
          url: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          comment_id: string;
          file_key: string;
          file_name: string;
          file_size: number;
          mime_type: string;
          url: string;
        };
        Update: never;
      };
      activities: {
        Row: {
          id: string;
          board_id: string;
          card_id: string | null;
          actor_id: string;
          type: ActivityType;
          payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          board_id: string;
          card_id?: string | null;
          actor_id: string;
          type: ActivityType;
          payload?: Json;
        };
        Update: never;
      };
      sprints: {
        Row: {
          id: string;
          board_id: string;
          title: string;
          sprint_number: number;
          goal: string;
          status: SprintStatus;
          started_at: string;
          ended_at: string | null;
        };
        Insert: {
          id?: string;
          board_id: string;
          title: string;
          sprint_number?: number;
          goal?: string;
          status?: SprintStatus;
        };
        Update: Partial<{ title: string; goal: string; status: SprintStatus; ended_at: string | null }>;
      };
      sprint_archived_cards: {
        Row: {
          id: string;
          sprint_id: string;
          board_id: string;
          card_title: string;
          card_description: string;
          card_priority: string | null;
          card_start_at: string | null;
          card_due_at: string | null;
          column_title: string;
          created_by_name: string | null;
          assignee_names: string[];
          assignee_ids: string[];
          watcher_names: string[];
          label_names: string[];
          label_colors: string[];
          checklist_total: number;
          checklist_done: number;
          comment_count: number;
          story_points: number | null;
          completed_at: string;
        };
        Insert: {
          id?: string;
          sprint_id: string;
          board_id: string;
          card_title: string;
          card_description?: string;
          card_priority?: string | null;
          card_start_at?: string | null;
          card_due_at?: string | null;
          column_title?: string;
          created_by_name?: string | null;
          assignee_names?: string[];
          assignee_ids?: string[];
          watcher_names?: string[];
          label_names?: string[];
          label_colors?: string[];
          checklist_total?: number;
          checklist_done?: number;
          comment_count?: number;
          story_points?: number | null;
        };
        Update: never;
      };
    };
    Views: Record<string, never>;
    Functions: {
      seed_demo_workspace: {
        Args: { p_user: string };
        Returns: string | null;
      };
    };
    Enums: {
      board_role: BoardRole;
      board_type: BoardType;
      card_priority: CardPriority;
      activity_type: ActivityType;
      sprint_status: SprintStatus;
    };
  };
}
