-- Add attractiveness_score column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS attractiveness_score numeric CHECK (attractiveness_score >= 0 AND attractiveness_score <= 10);

-- Add photo_url column to store the profile photo
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS photo_url text;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_attractiveness_score 
ON public.profiles(attractiveness_score);