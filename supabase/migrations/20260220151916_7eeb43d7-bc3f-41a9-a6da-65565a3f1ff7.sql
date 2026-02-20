-- Add gender_preference column to profiles to match external DB schema
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender_preference text DEFAULT NULL;