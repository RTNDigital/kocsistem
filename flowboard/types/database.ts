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
export type CardPriority = "low" | "med" | "high";
export type ActivityType =
  | "card_created"
  | "card_moved"
  | "card_completed"
  | "card_commented"
  | "board_created";

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
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          initials: string;
          color?: string;
        };
        Update: Partial<{ name: string; initials: string; color: string }>;
      };
      boards: {
        Row: {
          id: string;
          title: string;
          color: string;
          owner_id: string;
          starred: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          color?: string;
          owner_id: string;
          starred?: boolean;
        };
        Update: Partial<{ title: string; color: string; starred: boolean }>;
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
          due_at: string | null;
          position: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          board_id: string;
          column_id: string;
          title: string;
          description?: string;
          priority?: CardPriority | null;
          due_at?: string | null;
          position: string;
          created_by?: string | null;
        };
        Update: Partial<{
          title: string;
          description: string;
          priority: CardPriority | null;
          due_at: string | null;
          position: string;
          column_id: string;
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
      card_priority: CardPriority;
      activity_type: ActivityType;
    };
  };
}
