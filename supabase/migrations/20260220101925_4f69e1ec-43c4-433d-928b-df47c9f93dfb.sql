-- Add paused column to profiles for pause/unpause functionality
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS paused boolean DEFAULT false;