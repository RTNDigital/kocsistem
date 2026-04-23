-- Migration: Card-level activity logs
-- Run this against your Neon database

-- 1. Add new activity types
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'card_title_changed';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'card_description_changed';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'card_priority_changed';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'card_due_changed';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'card_start_changed';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'card_label_added';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'card_label_removed';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'card_assignee_added';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'card_assignee_removed';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'card_checklist_added';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'card_checklist_done';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'card_checklist_undone';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'card_checklist_deleted';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'card_deleted';

-- 2. Change activities.card_id FK from CASCADE to SET NULL
--    so activity logs survive when a card is deleted
ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_card_id_fkey;
ALTER TABLE public.activities
  ADD CONSTRAINT activities_card_id_fkey
  FOREIGN KEY (card_id) REFERENCES public.cards(id) ON DELETE SET NULL;

-- 3. Index to find deleted-card activities by original card_id stored in payload
CREATE INDEX IF NOT EXISTS activities_payload_card_id_idx
  ON public.activities ((payload->>'card_id'))
  WHERE card_id IS NULL;
